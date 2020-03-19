import { BitBuffer } from "./BitBuffer"

export interface IBaseDecoderOptions {
  streaming?: boolean
}

export interface IBaseDecoderTimeStampt {
  index: number
  time: number
}

export class BaseDecoder {
  destination = null
  canPlay: boolean = false

  collectTimestamps: boolean = false
  bytesWritten: number = 0
  timestamps: IBaseDecoderTimeStampt[] = []
  timestampIndex: number = 0

  startTime: number = 0
  decodedTime: number = 0
  bits: BitBuffer

  get currentTime() {
    return this.getCurrentTime()
  }

  public destroy() {}

  constructor(options: IBaseDecoderOptions = {}) {
    this.collectTimestamps = !options.streaming
  }

  public connect(destination) {
    this.destination = destination
  }

  public bufferGetIndex(): any {
    return this.bits.index
  }

  public bufferSetIndex(index: number) {
    this.bits.index = index
  }

  public bufferWrite(buffers: BitBuffer | BitBuffer[]): any {
    return this.bits.write(buffers)
  }

  public write(pts: number, buffers: BitBuffer | BitBuffer[]) {
    if(this.collectTimestamps) {
      if(this.timestamps.length === 0) {
        this.startTime = pts
        this.decodedTime = pts
      }

      this.timestamps.push({index: this.bytesWritten << 3, time: pts})
    }

    this.bytesWritten += this.bufferWrite(buffers)
    this.canPlay = true
  }

  public seek(time: number) {
    if(!this.collectTimestamps)
      return

    this.timestampIndex = 0

    for(let i = 0; i < this.timestamps.length; i++) {
      if(this.timestamps[i].time > time)
        break

      this.timestampIndex = i
    }

    let ts = this.timestamps[this.timestampIndex]

    if(ts) {
      this.bufferSetIndex(ts.index)
      this.decodedTime = ts.time
    } else {
      this.bufferSetIndex(0)
      this.decodedTime = this.startTime
    }
  }

  public decode() {
    this.advanceDecodedTime(0)
  }

  public advanceDecodedTime(seconds: number) {
    if(this.collectTimestamps) {
      let newTimestampIndex = -1
      let currentIndex = this.bufferGetIndex()

      for(let i = this.timestampIndex; i < this.timestamps.length; i++) {
        if(this.timestamps[i].index > currentIndex)
          break

        newTimestampIndex = i
      }

      // Мы нашли новый PTS, отличный от предыдущего? 
      // Если это так, нам не нужно увеличивать время 
      // декодирования вручную и вместо этого можно точно 
      // синхронизировать его с PTS.
      if(
        newTimestampIndex !== -1 &&
        newTimestampIndex !== this.timestampIndex
      ) {
        this.timestampIndex = newTimestampIndex
        this.decodedTime = this.timestampIndex[this.timestampIndex].time
        return
      }
    }

    this.decodedTime += seconds
  }

  public getCurrentTime() {
    return this.decodedTime
  }
}