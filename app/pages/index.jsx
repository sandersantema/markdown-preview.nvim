import React from 'react'
import Head from 'next/head'
import io from 'socket.io-client'
import MarkdownIt from 'markdown-it'
import mk from 'markdown-it-katex'
import hljs from 'highlight.js'
import mkuml from 'markdown-it-plantuml'
import emoji from 'markdown-it-emoji'
import meta from 'markdown-it-meta'
import taskLists from 'markdown-it-task-lists'
import markdownItChart from 'markdown-it-chart'
import footnote from 'markdown-it-footnote'

import chart from './chart'
import mkitMermaid from './mermaid'
import linenumbers from './linenumbers'
import image from './image'
import scrollToLine from './scroll'

const DEFAULT_OPTIONS = {
  mkit: {
    // Enable HTML tags in source
    html: true,
    // Use '/' to close single tags (<br />).
    // This is only for full CommonMark compatibility.
    xhtmlOut: true,
    // Convert '\n' in paragraphs into <br>
    breaks: false,
    // CSS language prefix for fenced blocks. Can be
    // useful for external highlighters.
    langPrefix: 'language-',
    // Autoconvert URL-like text to links
    linkify: true,
    // Enable some language-neutral replacement + quotes beautification
    typographer: true,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: '“”‘’',
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externally.
    // If result starts with <pre... internal wrapper is skipped.
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value
        } catch (__) {}
      }

      return '' // use external default escaping
    }
  },
  katex: {
    'throwOnError': false,
    'errorColor': ' #cc0000'
  },
  uml: {}
}

export default class PreviewPage extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      name: '',
      cursor: '',
      content: '',
      pageTitle: ''
    }
  }

  componentDidMount () {
    const socket = io({
      query: {
        bufnr: window.location.pathname.split('/')[2]
      }
    })

    window.socket = socket

    socket.on('connect', this.onConnect.bind(this))

    socket.on('disconnect', this.onDisconnect.bind(this))

    socket.on('close', this.onClose.bind(this))

    socket.on('refresh_content', this.onRefreshContent.bind(this))

    socket.on('close_page', this.onClose.bind(this))
  }

  onConnect () {
    console.log('connect success')
  }

  onDisconnect () {
    console.log('disconnect')
  }

  onClose () {
    console.log('close')
    window.close()
  }

  onRefreshContent ({
    options = {},
    isActive,
    winline,
    winheight,
    cursor,
    pageTitle = '',
    name = '',
    content
  }) {
    if (!this.md) {
      const {
        mkit = {},
        katex = {},
        uml = {},
        hide_yaml_meta: hideYamlMeta = 1
      } = options
      // markdown-it
      this.md = new MarkdownIt({
        ...DEFAULT_OPTIONS.mkit,
        ...mkit
      })
      if (hideYamlMeta === 1) {
        this.md.use(meta)
      }
      // katex
      this.md
        .use(mk, {
          ...DEFAULT_OPTIONS.katex,
          ...katex
        })
        .use(mkuml, {
          ...DEFAULT_OPTIONS.uml,
          ...uml
        })
        .use(emoji)
        .use(taskLists)
        .use(footnote)
        .use(image)
        .use(linenumbers)
        .use(mkitMermaid)
        .use(markdownItChart)
    }
    this.setState({
      cursor,
      name: name.split(/\\|\//).pop().split('.')[0],
      content: this.md.render(content.join('\n')),
      pageTitle
    }, () => {
      try {
        // eslint-disable-next-line
        mermaid.initialize(options.maid || {})
        // eslint-disable-next-line
        mermaid.init(undefined, document.querySelectorAll('.mermaid'))
      } catch (e) {}

      chart.render()

      if (isActive && !options.disable_sync_scroll) {
        scrollToLine[options.sync_scroll_type || 'middle']({
          cursor: cursor[1],
          winline,
          winheight,
          len: content.length
        })
      }
    })
  }

  render () {
    const { content, name, pageTitle } = this.state
    return (
      <React.Fragment>
        <Head>
          <title>{ pageTitle.replace(/\$\{name\}/, name) }</title>
          <link rel="shortcut icon" type="image/ico" href="/_static/favicon.ico" />
          <link rel="stylesheet" href="/_static/page.css" />
          <link rel="stylesheet" href="/_static/markdown.css" />
          <link rel="stylesheet" href="/_static/highlight.css" />
          <link rel="stylesheet" href="/_static/katex@0.5.1.css" />
          <script type="text/javascript" src="/_static/tweenlite.min.js"></script>
          <script type="text/javascript" src="/_static/mermaid.min.js"></script>
        </Head>
        <div id="page-ctn">
          <header id="page-header">
            <h3>
              <svg
                viewBox="0 0 16 16"
                version="1.1"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M3 5h4v1H3V5zm0 3h4V7H3v1zm0 2h4V9H3v1zm11-5h-4v1h4V5zm0 2h-4v1h4V7zm0 2h-4v1h4V9zm2-6v9c0 .55-.45 1-1 1H9.5l-1 1-1-1H2c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h5.5l1 1 1-1H15c.55 0 1 .45 1 1zm-8 .5L7.5 3H2v9h6V3.5zm7-.5H9.5l-.5.5V12h6V3z"
                >
                </path>
              </svg>
              { name }
            </h3>
          </header>
          <section
            className="markdown-body"
            dangerouslySetInnerHTML={{
              __html: content
            }}
          />
        </div>
      </React.Fragment>
    )
  }
}
