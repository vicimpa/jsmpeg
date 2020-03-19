interface IAjaxSourceOptions {
  onSourceCompleted?: AjaxSource['onCompletedCallback']
  onSourceEstablished?: AjaxSource['onEstablishedCallback']
}

export class AjaxSource {
  destination = null
  request: XMLHttpRequest = null
  streaming: boolean = false

  completed: boolean = false
  established: boolean = false
  progress: number = 0

  onCompletedCallback(ajax: AjaxSource) {}
  onEstablishedCallback(ajax: AjaxSource) {}

  constructor(public url: string, options: IAjaxSourceOptions = {}) {
    if(options.onSourceCompleted)
      this.onCompletedCallback = options.onSourceCompleted

    if(options.onSourceEstablished)
      this.onEstablishedCallback = options.onSourceEstablished
  }

  public connect(destination) {
    this.destination = destination
  }

  public start() {
    this.request = new XMLHttpRequest()

    this.request.onreadystatechange = () => {
      if (
        this.request.readyState === this.request.DONE && 
        this.request.status === 200
      ) {
        this.onLoad(this.request.response)
      }
    }
  
    this.request.onprogress = this.onProgress.bind(this)
    this.request.open('GET', this.url)
    this.request.responseType = "arraybuffer"
    this.request.send()
  }

  public resume(secondsHeadroom: number) {
    // Nothing to do here
  }

  public destroy() {
    this.request.abort()
  }

  public onProgress(ev: ProgressEvent) {
    this.progress = (ev.loaded / ev.total)
  }

  public onLoad(data: ArrayBuffer) {
    this.established = true
    this.completed = true
    this.progress = 1

    this.onCompletedCallback(this)
    this.onEstablishedCallback(this)

    if (this.destination) {
      this.destination.write(data)
    }
  }
}