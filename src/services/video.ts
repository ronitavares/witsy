
import { anyDict, MediaCreator, MediaCreationEngine, MediaReference } from '../types/index'
import { store } from '../services/store'
import { saveFileContents, download } from '../services/download'
import Replicate, { FileOutput } from 'replicate'
import { fal } from '@fal-ai/client'

export default class VideoCreator implements MediaCreator {

  static getEngines(checkApiKey: boolean): MediaCreationEngine[] {
    const engines = []
    if (!checkApiKey || store.config.engines.replicate.apiKey) {
      engines.push({ id: 'replicate', name: 'Replicate' })
    }
    if (!checkApiKey || store.config.engines.falai.apiKey) {
      engines.push({ id: 'falai', name: 'fal.ai' })
    }
    return engines
  }

  getEngines(checkApiKey: boolean): MediaCreationEngine[] {
    return VideoCreator.getEngines(checkApiKey)
  }
   
  async execute(engine: string, model: string, parameters: anyDict, reference?: MediaReference): Promise<any> {
    if (engine === 'replicate') {
      return this.replicate(model, parameters)
    } else if (engine === 'falai') {
      return this.falai(model, parameters, reference)
    } else {
      throw new Error('Unsupported engine')
    }
  }

  async replicate(model: string, parameters: anyDict): Promise<any> {

    // init
    const client = new Replicate({ auth: store.config.engines.replicate.apiKey }); 

    // call
    console.log(`[replicate] prompting model ${model}`)
    const output: FileOutput[] = await client.run(model as `${string}/${string}`, {
      input: parameters,
    }) as FileOutput[];

    // save the content on disk
    const blob = Array.isArray(output) ? await output[0].blob() : await (output as FileOutput).blob()
    const type = blob.type?.split('/')[1] || 'mp4'
    const b64 = await this.blobToBase64(blob)
    const image = b64.split(',')[1]
    const fileUrl = saveFileContents(type, image)
    //console.log('[image] saved image to', fileUrl)

    // return an object
    return {
      url: fileUrl,
    }

  }
  
  async falai(model: string, parameters: anyDict, reference?: MediaReference): Promise<anyDict> {

    try {

      // set api key
      fal.config({
        credentials: store.config.engines.falai.apiKey
      });

      // submit
      const response = await fal.subscribe(model, {
        input: {
          ...(parameters.prompt ? { prompt: parameters.prompt } : {}),
          ...(reference ? { image_url: `data:${reference.mimeType};base64,${reference.contents}` } : {}),
        }
      })

      // download
      const video = response.data.video
      const fileUrl = download(video.url)
      return { url: fileUrl }

    } catch (error) {
      console.error("Error generating content:", error);
      return { error: error.message }
    }
  
  }
  
  async blobToBase64(blob: Blob): Promise<string>{
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
  }
}
