namespace LZUTF8_LIGHT {
	if (runningInNodeJS()) {
		process.on('uncaughtException', function (e: any) {
			log(e);
		});
	}
}
