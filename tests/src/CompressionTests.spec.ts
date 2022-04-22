namespace LZUTF8_LIGHT {
	describe("LZ-UTF8:", () => {
		describe("Test inputs:", () => {
			const addTestsForInputString = (testStringTitle: string, inputString: string) => {
				describe(testStringTitle + ":", () => {
					describe("Basic tests with diffferent types of hash tables:", () => {
						let compressor1: Compressor;
						let compressor2: Compressor;
						let compressedData1: Uint8Array;
						let compressedData2: Uint8Array;

						beforeEach(() => {
							compressor1 = new Compressor(false);
							compressor2 = new Compressor(true);
							compressedData1 = compressor1.compressBlock(inputString);
							compressedData2 = compressor2.compressBlock(inputString);
						})

						it("Compresses correctly with simple hash table", () => {
							expect(decompress(compressedData1)).toEqual(inputString);
							expect(compressedData1.length).toBeLessThan(encodeUTF8(inputString).length);
						});

						it("Compresses correctly with custom hash table", () => {
							expect(decompress(compressedData2)).toEqual(inputString);
							expect(compressedData2.length).toBeLessThan(encodeUTF8(inputString).length);
						});

						it("Outputs the exact same data for both the simple and custom hash tables", () => {
							expect(compressedData1).toEqual(compressedData2);
						});

						it("Creates a simple hash table with a bucket count larger than 0", () => {
							expect(compressor1.prefixHashTable.getUsedBucketCount()).toBeGreaterThan(0);
						});

						it("Creates a custom hash table with a bucket count larger than 0", () => {
							expect(compressor2.prefixHashTable.getUsedBucketCount()).toBeGreaterThan(0);
						});

						it("Both the simple and custom hash tables have the same bucket usage", () => {
							expect(compressor1.prefixHashTable.getUsedBucketCount()).toEqual(compressor2.prefixHashTable.getUsedBucketCount());
						});

						it("Both the simple and custom hash tables have the same total element count", () => {
							expect(compressor1.prefixHashTable.getTotalElementCount()).toEqual(compressor2.prefixHashTable.getTotalElementCount());
						});
					});

					describe("Multi-part compression/decompression:", () => {
						it("Compresses and decompresses correctly when input and output are divided into multiple arbitrary parts", () => {
							const inputStringAsUTF8 = encodeUTF8(inputString);
							const part1 = inputStringAsUTF8.subarray(0, Math.floor(inputStringAsUTF8.length * 0.377345));
							const part2 = inputStringAsUTF8.subarray(Math.floor(inputStringAsUTF8.length * 0.377345), Math.floor(inputStringAsUTF8.length * 0.377345) + 2);
							const part3 = inputStringAsUTF8.subarray(Math.floor(inputStringAsUTF8.length * 0.377345) + 2, Math.floor(inputStringAsUTF8.length * 0.719283471));
							const part4 = inputStringAsUTF8.subarray(Math.floor(inputStringAsUTF8.length * 0.719283471), Math.floor(inputStringAsUTF8.length * 0.822345178225));
							const part5 = inputStringAsUTF8.subarray(Math.floor(inputStringAsUTF8.length * 0.822345178225));

							const compressor = new Compressor();
							const compressedData1 = compressor.compressBlock(part1);
							const compressedData2 = compressor.compressBlock(part2);
							const compressedData3 = compressor.compressBlock(part3);
							const compressedData4 = compressor.compressBlock(part4);
							const compressedData5 = compressor.compressBlock(part5);

							const joinedCompressedData = ArrayTools.concatUint8Arrays([compressedData1, compressedData2, compressedData3, compressedData4, compressedData5]);

							const decompressor = new Decompressor();
							const decompressedString1 = decompressor.decompressBlockToString(joinedCompressedData.subarray(0, Math.floor(joinedCompressedData.length * 0.2123684521)));
							const decompressedString2 = decompressor.decompressBlockToString(joinedCompressedData.subarray(Math.floor(joinedCompressedData.length * 0.2123684521), Math.floor(joinedCompressedData.length * 0.41218346219)));
							const decompressedString3 = decompressor.decompressBlockToString(joinedCompressedData.subarray(Math.floor(joinedCompressedData.length * 0.41218346219), Math.floor(joinedCompressedData.length * 0.74129384652)));
							const decompressedString4 = decompressor.decompressBlockToString(joinedCompressedData.subarray(Math.floor(joinedCompressedData.length * 0.74129384652), Math.floor(joinedCompressedData.length * 0.74129384652) + 2));
							const decompressedString5 = decompressor.decompressBlockToString(new Uint8Array(0));
							const decompressedString6 = decompressor.decompressBlockToString(joinedCompressedData.subarray(Math.floor(joinedCompressedData.length * 0.74129384652) + 2, Math.floor(joinedCompressedData.length * 0.9191234791281724)));
							const decompressedString7 = decompressor.decompressBlockToString(joinedCompressedData.subarray(Math.floor(joinedCompressedData.length * 0.9191234791281724)));

							expect(decompressedString1 + decompressedString2 + decompressedString3 + decompressedString4 + decompressedString5 + decompressedString6 + decompressedString7).toEqual(inputString);
						});

						it("Compresses and decompresses correctly when input and output are divided into hundreds of small random parts", () => {
							const truncatedLength = 5001;
							const truncatedInputString = truncateUTF16String(inputString, truncatedLength);
							const input = encodeUTF8(truncatedInputString);
							const compressor = new Compressor();

							const compressedParts: Uint8Array[] = [];
							for (let offset = 0; offset < input.length;) {
								const randomLength = Math.floor(Math.random() * 4);
								const endOffset = Math.min(offset + randomLength, input.length);

								const part = compressor.compressBlock(input.subarray(offset, endOffset));
								compressedParts.push(part);
								offset += randomLength;
							}

							const joinedCompressedParts = ArrayTools.concatUint8Arrays(compressedParts);

							const decompressor = new Decompressor();

							const decompressedParts: Uint8Array[] = [];
							for (let offset = 0; offset < input.length;) {
								expect(joinedCompressedParts).toBeDefined();

								const randomLength = Math.floor(Math.random() * 4);
								const endOffset = Math.min(offset + randomLength, joinedCompressedParts.length);
								const part = decompressor.decompressBlock(joinedCompressedParts.subarray(offset, endOffset));

								expect(() => Encoding.UTF8.decode(part)).not.toThrow(); // Make sure the part is a valid and untruncated UTF-8 sequence

								decompressedParts.push(part);
								offset += randomLength;
							}

							const joinedDecompressedParts = ArrayTools.concatUint8Arrays(decompressedParts);

							expect(decodeUTF8(joinedDecompressedParts)).toEqual(truncatedInputString);
						});
					});

					describe("Special properties:", () => {
						it("Will decompresses the uncompressed string to itself (assuring UTF-8 backwards compatibility)", () => {
							const decompressedUncompressedString = decompress(encodeUTF8(inputString));

							expect(decompressedUncompressedString).toEqual(inputString);
						});
					});
				});
			};

			addTestsForInputString("Lorem ipsum", TestData.loremIpsum);
			addTestsForInputString("Chinese text", TestData.chineseText);
			addTestsForInputString("Hindi text", TestData.hindiText);
			addTestsForInputString("Random unicode characters (up to codepoint 1112064)", Random.getRandomUTF16StringOfLength(2000));
			addTestsForInputString("Long mixed text", TestData.hindiText + TestData.loremIpsum + TestData.hindiText + TestData.chineseText + TestData.chineseText);
			addTestsForInputString("Repeating String 'aaaaaaa'..", repeatString("aaaaaaaaaa", 2000));
		});

		describe("Synchronous operations with different input and output encodings", () => {
			const sourceAsString = TestData.hindiText.substr(0, 100);
			const sourceAsByteArray = encodeUTF8(sourceAsString);

			function addTestForEncodingCombination(testedSourceEncoding: string, testedCompressedEncoding: CompressedEncoding, testedDecompressedEncoding: UncompressedEncoding) {
				it("Successfuly compresses a " + testedSourceEncoding + " to a " + testedCompressedEncoding + " and decompresses to a " + testedDecompressedEncoding, () => {
					let source: string | Uint8Array;

					if (testedSourceEncoding == "String")
						source = sourceAsString;
					else
						source = sourceAsByteArray;

					const compressedData = compress(source, { outputEncoding: testedCompressedEncoding });

					expect(verifyEncoding(compressedData, testedCompressedEncoding)).toBe(true);

					const decompressedData = decompress(compressedData, { inputEncoding: testedCompressedEncoding, outputEncoding: testedDecompressedEncoding });

					if (testedDecompressedEncoding == "String")
						expect(decompressedData).toEqual(sourceAsString);
					else if (testedDecompressedEncoding == "ByteArray")
						expect(decompressedData).toEqual(sourceAsByteArray);
				});
			}

			addTestForEncodingCombination("String", "ByteArray", "String");
			addTestForEncodingCombination("String", "ByteArray", "ByteArray");
			addTestForEncodingCombination("String", "BinaryString", "String");
			addTestForEncodingCombination("String", "BinaryString", "ByteArray");
			addTestForEncodingCombination("String", "StorageBinaryString", "String");
			addTestForEncodingCombination("String", "StorageBinaryString", "ByteArray");
			addTestForEncodingCombination("String", "Base64", "String");
			addTestForEncodingCombination("String", "Base64", "ByteArray");

			if (runningInNodeJS()) {
				addTestForEncodingCombination("String", "Buffer", "String");
				addTestForEncodingCombination("String", "Buffer", "ByteArray");
			}

			addTestForEncodingCombination("ByteArray", "ByteArray", "String");
			addTestForEncodingCombination("ByteArray", "ByteArray", "ByteArray");
			addTestForEncodingCombination("ByteArray", "BinaryString", "String");
			addTestForEncodingCombination("ByteArray", "BinaryString", "ByteArray");
			addTestForEncodingCombination("ByteArray", "StorageBinaryString", "String");
			addTestForEncodingCombination("ByteArray", "StorageBinaryString", "ByteArray");
			addTestForEncodingCombination("ByteArray", "Base64", "String");
			addTestForEncodingCombination("ByteArray", "Base64", "ByteArray");

			if (runningInNodeJS()) {
				addTestForEncodingCombination("ByteArray", "Buffer", "String");
				addTestForEncodingCombination("ByteArray", "Buffer", "ByteArray");
			}
		});

		describe("Error handling:", () => {
			it("Throws on undefined or null input for synchronous compression and decompression", () => {
				expect(() => compress(<any> undefined)).toThrow();
				expect(() => compress(<any> null)).toThrow();
				expect(() => decompress(<any> undefined)).toThrow();
				expect(() => decompress(<any> null)).toThrow();

				const compressor = new Compressor();
				expect(() => compressor.compressBlock(<any> undefined)).toThrow();
				expect(() => compressor.compressBlock(<any> null)).toThrow();

				const decompressor = new Decompressor();
				expect(() => decompressor.decompressBlock(<any> undefined)).toThrow();
				expect(() => decompressor.decompressBlock(<any> null)).toThrow();

			});

		});

		describe("Trivial cases:", () => {
			it("Handles zero length input for compression and decompression", () => {
				expect(compress(new Uint8Array(0))).toEqual(new Uint8Array(0));

				expect(decompress(new Uint8Array(0))).toEqual("");
				expect(decompress(new Uint8Array(0), { outputEncoding: "ByteArray" })).toEqual(new Uint8Array(0));

				const compressor = new Compressor();
				expect(compressor.compressBlock(new Uint8Array(0))).toEqual(new Uint8Array(0));

				const decompressor = new Decompressor();
				expect(decompressor.decompressBlock(new Uint8Array(0))).toEqual(new Uint8Array(0));
				expect(decompressor.decompressBlockToString(new Uint8Array(0))).toEqual("");
			});

			if (runningInNodeJS()) {
				it("Automatically converts Buffers to Uint8Arrays (sync)", () => {
					const compressedText = compress(new Buffer(TestData.loremIpsum));
					const decompressedText = decompress(new Buffer(<Uint8Array>compressedText));

					expect(decompressedText).toEqual(TestData.loremIpsum);
				});

				it("Automatically converts Buffers to Uint8Arrays (sync, incremental)", () => {
					const compressor = new Compressor();
					const compressedText = compressor.compressBlock(<any>new Buffer(TestData.loremIpsum));

					const decompressor = new Decompressor();
					const decompressedText = decompressor.decompressBlock(<any>new Buffer(compressedText));

					expect(decodeUTF8(decompressedText)).toEqual(TestData.loremIpsum);
				});

			}
		});


		describe("Special bytestream features:", () => {
			it("Allows concatenation of multiple compressed and uncompressed streams to a single, valid compressed stream", () => {
				const compressdData1 = compress(TestData.chineseText);
				const rawData = encodeUTF8(TestData.hindiText);
				const compressedData2 = compress(TestData.chineseText);
				const compressedData3 = compress(TestData.loremIpsum);

				const mixedData = ArrayTools.concatUint8Arrays(<Uint8Array[]>[compressdData1, rawData, compressedData2, compressedData3]);

				const decompressedMixedData = decompress(mixedData);
				expect(decompressedMixedData).toEqual(TestData.chineseText + TestData.hindiText + TestData.chineseText + TestData.loremIpsum);
			});
		});

	});
}
