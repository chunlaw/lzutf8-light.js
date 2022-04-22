# LZ-UTF8-LIGHT

LZ-UTF8-LIGHT, lightweight version forded from [LZ-UTF8](https://github.com/rotemdan/lzutf8.js) is a string compression library and format. Is an extension to the [UTF-8](https://en.wikipedia.org/wiki/UTF-8) character encoding, augmenting the UTF-8 bytestream with optional compression based the [LZ77](https://en.wikipedia.org/wiki/LZ77_and_LZ78) algorithm. Some of its properties:

* Compresses **strings only**. Doesn't support arbitrary byte sequences.
* Strongly optimized for speed, both in the choice of algorithm and its implementation. Approximate measurements using a low-end desktops and 1MB strings: 3-14MB/s compression , 20-120MB/s decompression (detailed benchmarks and comparison to other Javascript libraries can be found in the [technical paper](https://goo.gl/0g0fzm)). Due to the concentration on time efficiency, the resulting compression ratio can be significantly lower when compared to more size efficient algorithms like LZW + entropy coding.
* **Byte-level superset of UTF-8**. Any valid UTF-8 bytestream is also a valid LZ-UTF8 stream (but not vice versa). This special property allows both compressed and plain UTF-8 streams to be freely concatenated and decompressed as single unit (or with any arbitrary partitioning). Some possible applications:
  * Sending static pre-compressed data followed by dynamically generated uncompressed data from a server (and possibly appending a compressed static "footer", or repeating the process several times).
  * Appending both uncompressed/compressed data to a compressed log file/journal without needing to rewrite it.
  * Joining multiple source files, where some are possibly pre-compressed, and serving them as a single concatenated file without additional processing.
* Patent free (all relevant patents have long expired).

**Javascript implementation:**

* Tested on most popular browsers and platforms: Node.js 4+, Chrome, Firefox, Opera, Edge, IE10+ (IE8 and IE9 may work with a [typed array polyfill](https://github.com/inexorabletash/polyfill/blob/master/typedarray.js)), Android 4+, Safari 5+.
* Allows compressed data to be efficiently packed in plain Javascript UTF-16 strings (see the `"BinaryString"` encoding described later in this document) when binary storage is not available or desired (e.g. when using LocalStorage or older IndexedDB).
* Supports Node.js streams.
* Written in TypeScript.

# Quick start

* Try the [online demo](https://rotemdan.github.io/lzutf8/demo/) to test and benchmark different inputs.
* Download the [latest build](https://unpkg.com/lzutf8) (or the [minified version](https://unpkg.com/lzutf8/production/lzutf8.min.js)).
* Run the [automated tests](https://rotemdan.github.io/lzutf8/tests/).
* Run the [core benchmarks](https://rotemdan.github.io/lzutf8/benchmarks/).
* Read the [technical paper](https://rotemdan.github.io/lzutf8/docs/paper.pdf).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


# Table of Contents

- [API Reference](#api-reference)
  - [Getting started](#getting-started)
  - [Type Identifier Strings](#type-identifier-strings)
  - [Core Methods](#core-methods)
    - [LZUTF8_LIGHT.compress(..)](#lzutf8compress)
    - [LZUTF8_LIGHT.decompress(..)](#lzutf8decompress)
  - [Lower-level Methods](#lower-level-methods)
    - [LZUTF8_LIGHT.Compressor](#lzutf8compressor)
    - [LZUTF8_LIGHT.Compressor.compressBlock(..)](#lzutf8compressorcompressblock)
    - [LZUTF8_LIGHT.Decompressor](#lzutf8decompressor)
    - [LZUTF8_LIGHT.Decompressor.decompressBlock(..)](#lzutf8decompressordecompressblock)
    - [LZUTF8_LIGHT.Decompressor.decompressBlockToString(..)](#lzutf8decompressordecompressblocktostring)
  - [Node.js only methods](#nodejs-only-methods)
    - [LZUTF8_LIGHT.createCompressionStream()](#lzutf8createcompressionstream)
    - [LZUTF8_LIGHT.createDecompressionStream()](#lzutf8createdecompressionstream)
  - [Character encoding methods](#character-encoding-methods)
    - [LZUTF8_LIGHT.encodeUTF8(..)](#lzutf8encodeutf8)
    - [LZUTF8_LIGHT.decodeUTF8(..)](#lzutf8decodeutf8)
    - [LZUTF8_LIGHT.encodeBase64(..)](#lzutf8encodebase64)
    - [LZUTF8_LIGHT.decodeBase64(..)](#lzutf8decodebase64)
    - [LZUTF8_LIGHT.encodeStorageBinaryString(..)](#lzutf8encodestoragebinarystring)
    - [LZUTF8_LIGHT.decodeStorageBinaryString(..)](#lzutf8decodestoragebinarystring)
- [Release history](#release-history)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# API Reference

## Getting started

Node.js:

```
npm install lzutf8
```
```js
var LZUTF8_LIGHT = require('lzutf8');
```

Browser:
```html
<script id="lzutf8" src="https://cdn.jsdelivr.net/npm/lzutf8/build/production/lzutf8.js"></script>
```
or the minified version:
```html
<script id="lzutf8" src="https://cdn.jsdelivr.net/npm/lzutf8/build/production/lzutf8.min.js"></script>
```
to reference a particular version use the pattern, where `x.x.x` should be replaced with the exact version number (e.g. `0.4.6`):
```html
<script id="lzutf8" src="https://unpkg.com/lzutf8@x.x.x/build/production/lzutf8.min.js"></script>
```

*note: the `id` attribute and its exact value are necessary for the library to make use of web workers.*

## Type Identifier Strings

*`"ByteArray"`* - An array of bytes. As of `0.3.2`, always a `Uint8Array`. In versions up to `0.2.3` the type was determined by the platform (`Array` for browsers that don't support typed arrays, `Uint8Array` for supporting browsers and `Buffer` for Node.js).

IE8/9 and support was dropped at `0.3.0` though these browsers can still be used with a [typed array polyfill](https://github.com/inexorabletash/polyfill/blob/master/typedarray.js).

*`"Buffer"`* - A Node.js `Buffer` object.

*`"StorageBinaryString"`* - A `string` containing compacted binary data encoded to fit in valid UTF-16 strings. _Please note the older, deprecated, `"BinaryString"` encoding, is still internally supported in the library but has been removed from this document. More details are included further in this document._

*`"Base64"`* - A [base 64](https://en.wikipedia.org/wiki/Base64) string.


## Core Methods

### LZUTF8_LIGHT.compress(..)

```js
var output = LZUTF8_LIGHT.compress(input, [options]);
```
Compresses the given input data.

*`input`* can be either a `String` or UTF-8 bytes stored in a `Uint8Array` or `Buffer`

*`options`* (optional): an object that may have any of the properties:

* `outputEncoding`: `"ByteArray"` (default), `"Buffer"`, `"StorageBinaryString"` or `"Base64"`

*returns*: compressed data encoded by `encoding`, or `ByteArray` if not specified.


### LZUTF8_LIGHT.decompress(..)

```js
var output = LZUTF8_LIGHT.decompress(input, [options]);
```
Decompresses the given compressed data.

*`input`*: can be either a `Uint8Array`, `Buffer` or `String` (where encoding scheme is then specified in `inputEncoding`)

*`options`* (optional): an object that may have the properties:

* `inputEncoding`:  `"ByteArray"` (default), `"StorageBinaryString"` or `"Base64"`
* `outputEncoding`: `"String"` (default), `"ByteArray"` or `"Buffer"` to return UTF-8 bytes

*returns*: decompressed bytes encoded as `encoding`, or as `String` if not specified.

## Lower-level Methods


### LZUTF8_LIGHT.Compressor

```js
var compressor = new LZUTF8_LIGHT.Compressor();
```
Creates a compressor object. Can be used to incrementally compress a multi-part stream of data.

*returns*: a new `LZUTF8_LIGHT.Compressor` object

### LZUTF8_LIGHT.Compressor.compressBlock(..)

```js
var compressor = new LZUTF8_LIGHT.Compressor();
var compressedBlock = compressor.compressBlock(input);
```
Compresses the given input UTF-8 block.

*`input`* can be either a `String`, or UTF-8 bytes stored in a `Uint8Array` or `Buffer`

*returns*: compressed bytes as `ByteArray`

This can be used to incrementally create a single compressed stream. For example:

```js
var compressor = new LZUTF8_LIGHT.Compressor();
var compressedBlock1 = compressor.compressBlock(block1);
var compressedBlock2 = compressor.compressBlock(block2);
var compressedBlock3 = compressor.compressBlock(block3);
..
```

### LZUTF8_LIGHT.Decompressor

```js
var decompressor = new LZUTF8_LIGHT.Decompressor();
```
Creates a decompressor object. Can be used to incrementally decompress a multi-part stream of data.

*returns*: a new `LZUTF8_LIGHT.Decompressor` object

### LZUTF8_LIGHT.Decompressor.decompressBlock(..)

```js
var decompressor = new LZUTF8_LIGHT.Decompressor();
var decompressedBlock = decompressor.decompressBlock(input);
```
Decompresses the given block of compressed bytes.

*`input`* can be either a `Uint8Array` or `Buffer`

*returns*: decompressed UTF-8 bytes as `ByteArray`

*Remarks*: will always return the longest valid UTF-8 stream of bytes possible from the given input block. Incomplete input or output byte sequences will be prepended to the next block.

*Note*: This can be used to incrementally decompress a single compressed stream. For example:

```js
var decompressor = new LZUTF8_LIGHT.Decompressor();
var decompressedBlock1 = decompressor.decompressBlock(block1);
var decompressedBlock2 = decompressor.decompressBlock(block2);
var decompressedBlock3 = decompressor.decompressBlock(block3);
..
```

### LZUTF8_LIGHT.Decompressor.decompressBlockToString(..)

```js
var decompressor = new LZUTF8_LIGHT.Decompressor();
var decompressedBlockAsString = decompressor.decompressBlockToString(input);
```
Decompresses the given block of compressed bytes  and converts the result to a `String`.

*`input`* can be either a `Uint8Array` or `Buffer`

*returns*: decompressed `String`

*Remarks*: will always return the longest valid string possible from the given input block. Incomplete input or output byte sequences will be prepended to the next block.


## Node.js only methods


### LZUTF8_LIGHT.createCompressionStream()

```js
var compressionStream = LZUTF8_LIGHT.createCompressionStream();
```

Creates a compression stream. The stream will accept both Buffers and Strings in any encoding supported by Node.js (e.g. `utf8`, `utf16`, `ucs2`, `base64`, `hex`, `binary` etc.) and return Buffers.

*example*:
```js
var sourceReadStream = fs.createReadStream(“content.txt”);
var destWriteStream = fs.createWriteStream(“content.txt.lzutf8”);
var compressionStream = LZUTF8_LIGHT.createCompressionStream();

sourceReadStrem.pipe(compressionStream).pipe(destWriteStream);
```

*On error*: emits an `error` event with the `Error` object as parameter.

### LZUTF8_LIGHT.createDecompressionStream()

```js
var decompressionStream = LZUTF8_LIGHT.createDecompressionStream();
```

Creates a decompression stream. The stream will accept and return Buffers.

*On error*: emits an `error` event with the `Error` object as parameter.

## Character encoding methods


### LZUTF8_LIGHT.encodeUTF8(..)

```js
var output = LZUTF8_LIGHT.encodeUTF8(input);
```
Encodes a string to UTF-8.

*`input`* as `String`

*returns*: encoded bytes as `ByteArray`


### LZUTF8_LIGHT.decodeUTF8(..)

```js
var outputString = LZUTF8_LIGHT.decodeUTF8(input);
```
Decodes UTF-8 bytes to a String.

*`input`* as either a `Uint8Array` or `Buffer`

*returns*: decoded bytes as `String`


### LZUTF8_LIGHT.encodeBase64(..)

```js
var outputString = LZUTF8_LIGHT.encodeBase64(bytes);
```
Encodes bytes to a Base64 string.

*`input`* as either a `Uint8Array` or `Buffer`

*returns*: resulting Base64 string.

*remarks*: Maps every 3 consecutive input bytes to 4 output characters of the set `A-Z`,`a-z`,`0-9`,`+`,`/` (a total of 64 characters). Increases stored byte size to 133.33% of original (when stored as ASCII or UTF-8) or 266% (stored as UTF-16).

### LZUTF8_LIGHT.decodeBase64(..)

```js
var output = LZUTF8_LIGHT.decodeBase64(input);
```
Decodes UTF-8 bytes to a String.

*`input`* as `String`

*returns*: decoded bytes as `ByteArray`

*remarks:* the decoder cannot decode concatenated base64 strings. Although it is possible to add this capability to the JS version, compatibility with other decoders (such as the Node.js decoder) prevents this feature to be added.

### LZUTF8_LIGHT.encodeStorageBinaryString(..)

_Note: the older `BinaryString` encoding has been deprecated due to a [compatibility issue with the IE browser's LocalStorage/SessionStorage implementation](https://github.com/rotemdan/lzutf8.js/issues/11). This newer version works around that issue by avoiding the `0` codepoint._

```js
var outputString = LZUTF8_LIGHT.encodeStorageBinaryString(input);
```
Encodes binary bytes to a valid UTF-16 string.

*`input`* as either a `Uint8Array` or `Buffer`

*returns*: `String`

*remarks*: To comply with the UTF-16 standard, it only uses the bottom 15 bits of each character, effectively mapping every 15 input bits to a single 16 bit output character. This Increases the stored byte size to 106.66% of original.

### LZUTF8_LIGHT.decodeStorageBinaryString(..)

_Note: the older `BinaryString` encoding has been deprecated due to a [compatibility issue with the IE browser's LocalStorage/SessionStorage implementation](https://github.com/rotemdan/lzutf8.js/issues/11). This newer version works around that issue by avoiding the `0` codepoint._

```js
var output = LZUTF8_LIGHT.decodeStorageBinaryString(input);
```
Decodes a binary string.

*`input`* as `String`

*returns*: decoded bytes as `ByteArray`

*remarks:* Multiple binary strings may be freely concatenated and decoded as a single string. This is made possible by ending every sequence with special marker (char code 32768 for an even-length sequence and 32769 for a an odd-length sequence).


# Release history

* ```0.1.x```: Initial release.
* ```0.2.x```: Added async error handling. Added support for `TextEncoder` and `TextDecoder` when available.
* ```0.3.x```: Removed support to IE8/9. Removed support for plain `Array` inputs. All `"ByteArray"` outputs are now `Uint8Array` objects. A separate `"Buffer"` encoding setting can be used to return `Buffer` objects.
* ```0.4.x```: Major code restructuring. Removed support for versions of Node.js prior to `4.0`.
* ```0.5.x```: Added the `"StorageBinaryString"` encoding.

# License

Copyright (c) 2014-2018, Rotem Dan &lt;rotemdan@gmail.com&gt;.

Source code and documentation are available under the [MIT license](http://choosealicense.com/licenses/mit/).
