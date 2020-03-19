export function Now() {
  return window.performance
    ? window.performance.now() / 1000
      : Date.now() / 1000
}

export function CreateVideoElements() {
  let elements = document.querySelectorAll('.jsmpeg')
  for (let i = 0; i < elements.length; i++) {
    // new JSMpeg.VideoElement(elements[i])
  }
}

export function Fill(array, value) {
  if (array.fill) {
    array.fill(value)
  }
  else {
    for (let i = 0; i < array.length; i++) {
      array[i] = value
    }
  }
}

export function Base64ToArrayBuffer(base64: string) {
  let binary = window.atob(base64)
  let length = binary.length
  let bytes = new Uint8Array(length)

  for (let i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}