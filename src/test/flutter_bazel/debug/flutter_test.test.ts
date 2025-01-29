import { isWin } from "../../../shared/constants";
import { DebuggerType } from "../../../shared/enums";
import { fsPath } from "../../../shared/utils/fs";
import { DartDebugClient } from "../../dart_debug_client";
import { createDebugClient, killFlutterTester, startDebugger, waitAllThrowIfTerminates } from "../../debug_helpers";
import { activate, ensureHasRunRecently, extApi, flutterBazelRoot, flutterBazelTestMainFile, prepareHasRunFile } from "../../helpers";

describe("flutter test debugger", () => {
	beforeEach(function () {
		if (isWin)
			this.skip();
	});

	beforeEach("activate flutterTestMainFile", () => activate(flutterBazelTestMainFile));

	let dc: DartDebugClient;
	beforeEach("create debug client", function () {
		// When in Bazel, the Flutter version is set to MAX_VERSION which enables everything, so use
		// the Dart SDK version instead as an approx indicator of whether the SDK supports the dap.
		if (process.env.DART_CODE_FORCE_SDK_DAP === "true" && !extApi.dartCapabilities.supportsSdkDap)
			this.skip();

		dc = createDebugClient(DebuggerType.FlutterTest);
	});

	afterEach(killFlutterTester);

	it("runs a Flutter test script to completion using custom script", async () => {
		const root = fsPath(flutterBazelRoot);
		const hasRunFile = prepareHasRunFile(root, "flutter_test");

		const config = await startDebugger(dc, flutterBazelTestMainFile, { suppressPrompts: true });
		await waitAllThrowIfTerminates(dc,
			dc.configurationSequence(),
			dc.waitForEvent("terminated"),
			dc.launch(config),
		);

		ensureHasRunRecently(root, hasRunFile);
	});
});
