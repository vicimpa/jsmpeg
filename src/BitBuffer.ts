type TBuffer = ArrayLike<number> | Uint8Array

export class BitBuffer {
  bytes: Uint8Array

  index: number = 0
  byteLength: number = 0

  constructor(buffer?: ArrayLike<number>, mode?: number)
  constructor(length?: number, mode?: number)
  constructor(bufferOrLength = null, public mode = 1) {
    if (typeof bufferOrLength === 'object') {
      if (bufferOrLength instanceof Uint8Array)
        this.bytes = bufferOrLength
      else
        this.bytes = new Uint8Array(bufferOrLength)

      this.byteLength = this.bytes.length
    }
    else {
      this.bytes = new Uint8Array(bufferOrLength || 1024 * 1024)
    }
  }

  public resize(size: number) {
    const newBytes = new Uint8Array(size)

    if (this.byteLength !== 0) {
      this.byteLength = Math.min(this.byteLength, size)
      newBytes.set(this.bytes, 0/*, this.byteLength/**/)
    }

    this.bytes = newBytes
    this.index = Math.min(this.index, this.byteLength << 3)
  }

  public evict(sizeNeeded: number) {
    let bytePos = this.index >> 3
    let available = this.bytes.length - this.byteLength

    // Если текущим индексом является позиция записи, 
    // мы можем просто сбросить оба на 0. Также сбросьте 
    // (и выбросьте непрочитанные данные), если мы не сможем 
    // чтобы соответствовать новым данным даже после нормального выселения.
    if (
      this.index === this.byteLength << 3 ||
      sizeNeeded > available + bytePos // аварийная эвакуация
    ) {
      this.byteLength = 0
      this.index = 0
      return
    } else if (bytePos === 0) {
      // Ничего еще не прочитано - мы не можем ничего выселить
      return;
    }

    // Некоторые браузеры пока не поддерживают copyWithin() - 
    // нам, возможно, придется сделать это вручную, используя 
    // set и subarray
    if (this.bytes.copyWithin) {
      this.bytes.copyWithin(0, bytePos, this.byteLength)
    } else {
      this.bytes.set(this.bytes.subarray(bytePos, this.byteLength))
    }

    this.byteLength = this.byteLength - bytePos
    this.index -= bytePos << 3
  }

  public write(buffers: BitBuffer | BitBuffer[]) {
    let totalLength = 0
    let available = this.bytes.length - this.byteLength

    // Рассчитать общую длину байтов
    if (buffers instanceof Array) {
      for (let i = 0; i < buffers.length; i++) {
        totalLength += buffers[i].byteLength
      }
    }
    else {
      totalLength = buffers.byteLength
    }

    // Нужно ли нам менять размеры или выселять?
    if (totalLength > available) {
      if (this.mode === BitBuffer.MODE.EXPAND) {
        let newSize = Math.max(
          this.bytes.length * 2,
          totalLength - available
        )
        this.resize(newSize)
      }
      else {
        this.evict(totalLength)
      }
    }

    if (buffers instanceof Array) {
      for (var i = 0; i < buffers.length; i++) {
        this.appendSingleBuffer(buffers[i])
      }
    }
    else {
      this.appendSingleBuffer(buffers)
    }

    return totalLength
  }

  public appendSingleBuffer(buffer: TBuffer | BitBuffer) {
    if (!(buffer instanceof BitBuffer))
      buffer = new BitBuffer(buffer)

    this.bytes.set(buffer.bytes, this.byteLength)
    this.byteLength += buffer.byteLength
  }

  public findNextStartCode() {
    for (var i = (this.index + 7 >> 3); i < this.byteLength; i++) {
      if (
        this.bytes[i] == 0x00 &&
        this.bytes[i + 1] == 0x00 &&
        this.bytes[i + 2] == 0x01
      ) {
        this.index = (i + 4) << 3
        return this.bytes[i + 3]
      }
    }
    this.index = (this.byteLength << 3)
    return -1
  }

  public findStartCode(code: number) {
    while (true) {
      let current = this.findNextStartCode()

      if (current === code || current === -1) {
        return current
      }
    }
  }

  public nextBytesAreStartCode() {
    let i = (this.index + 7 >> 3)
    return (
      i >= this.byteLength || (
        this.bytes[i] == 0x00 &&
        this.bytes[i + 1] == 0x00 &&
        this.bytes[i + 2] == 0x01
      )
    )
  }

  public peek(count: number) {
    let offset = this.index
    let value = 0

    while (count) {
      let currentByte = this.bytes[offset >> 3]
      let remaining = 8 - (offset & 7) // оставшиеся биты в байте
      let read = remaining < count ? remaining : count // биты в этом прогоне
      let shift = remaining - read
      let mask = (0xff >> (8 - read))

      value = (value << read) | ((currentByte & (mask << shift)) >> shift)

      offset += read
      count -= read
    }

    return value;
  }

  public read(count: number) {
    let value = this.peek(count)
    this.index += count
    return value
  }

  public skip(count: number) {
    this.index += count
    return this.index 
  }

  public rewind(count: number) {
    this.index = Math.max(this.index - count, 0)
  }

  public has(count: number) {
    return ((this.byteLength << 3) - this.index) >= count
  }

  static MODE = {
    EVICT: 1,
    EXPAND: 2
  }
}