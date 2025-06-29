
import { anyDict } from 'types/index'
import { PluginExecutionContext, PluginParameter } from 'multi-llm-ts'
import Plugin, { PluginConfig } from './plugin'
import Tavily from '../vendor/tavily'
import { convert } from 'html-to-text'
import { t } from '../services/i18n'

export default class extends Plugin {

  constructor(config: PluginConfig) {
    super(config)
  }

  isEnabled(): boolean {
    return this.config?.enabled && (
      (this.config.engine == 'local') ||
      (this.config.engine == 'tavily' && this.config.tavilyApiKey?.trim().length > 0) ||
      (this.config.engine == 'brave' && this.config.braveApiKey?.trim().length > 0)
    )
  }

  getName(): string {
    return 'search_internet'
  }

  getDescription(): string {
    return 'This tool allows you to search the web for information on a given topic. Try to include links to the sources you use in your response.'
  }

  getPreparationDescription(): string {
    return this.getRunningDescription()
  }

  getRunningDescription(): string {
    return t('plugins.search.running')
  }

  getCompletedDescription(tool: string, args: any, results: any): string | undefined {
    if (results.error) {
      return t('plugins.search.error')
    } else {
      return t('plugins.search.completed', { query: args.query, count: results.results.length })
    }
  }

  getParameters(): PluginParameter[] {
    return [
      {
        name: 'query',
        type: 'string',
        description: 'The query to search for',
        required: true
      }
    ]
  }

  async execute(context: PluginExecutionContext, parameters: anyDict): Promise<anyDict> {
    if (this.config.engine === 'local') {
      return this.local(parameters)
    } else if (this.config.engine === 'tavily') {
      return this.tavily(parameters)
    } else if (this.config.engine === 'brave') {
      return this.brave(parameters)
    } else {
      return { error: 'Invalid engine' }
    }
  }

  async local(parameters: anyDict): Promise<anyDict> {

    try {
      const results = await window.api.search.query(parameters.query, this.config.maxResults || 5)
      const response = {
        query: parameters.query,
        results: results.map(result => ({
          title: result.title,
          url: result.url,
          content: this.truncateContent(this.htmlToText(result.content))
        }))
      }
      //console.log('Local search response:', response)
      return response
    } catch (error) {
      return { error: error.message }
    }
  }

  async tavily(parameters: anyDict): Promise<anyDict> {

    try {

      // tavily
      const tavily = new Tavily(this.config.tavilyApiKey)
      const results = await tavily.search(parameters.query, {
        //include_answer: true,
        //include_raw_content: true,
      })

      // content returned by tavily is very short
      for (const result of results.results) {
        const html = await fetch(result.url).then(response => response.text())
        result.content = this.htmlToText(html)
      }

      // done
      const response = {
        query: parameters.query,
        results: results.results.map(result => ({
          title: result.title,
          url: result.url,
          content: this.truncateContent(result.content)
        }))
      }
      //console.log('Tavily response:', response)
      return response

    } catch (error) {
      return { error: error.message }
    }
  }

  async brave(parameters: anyDict): Promise<anyDict> {

    try {

      const baseUrl = 'https://api.search.brave.com/res/v1/web/search'
      const response = await fetch(`${baseUrl}?q=${encodeURIComponent(parameters.query)}&count=${this.config.maxResults || 5}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.config.braveApiKey
        }
      })

      const data = await response.json()

      return {
        query: parameters.query,
        results: data.web.results.map((result: any) => ({
          url: result.url,
          title: result.title,
          content: this.truncateContent(result.description)
        }))
      }

    } catch (error) {
      return { error: error.message }
    }
  }

  htmlToText(html: string): string {

    // if we find a main section then let's convert that only
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (main) {
      html = main[0]
    }

    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: 'nav', format: 'skip' },
        { selector: 'img', format: 'skip' },
        { selector: 'form', format: 'skip' },
        { selector: 'button', format: 'skip' },
        { selector: 'input', format: 'skip' },
        { selector: 'select', format: 'skip' },
        { selector: 'a', format: 'skip' },
      ]
    })
  }

  truncateContent(content: string): string {
    if (!this.config.contentLength) {
      return content
    } else {
      return content.slice(0, this.config.contentLength)
    }
  }

}
