import * as vs from "vscode";
import { TextDocumentEdit, WorkspaceEdit } from "vscode-languageclient";
import { LspAnalyzer } from "../analysis/analyzer_lsp";
import * as editors from "../editors";

export class LspEditCommands implements vs.Disposable {
	private commands: vs.Disposable[] = [];

	constructor(private readonly analyzer: LspAnalyzer) {
		this.commands.push(
			vs.commands.registerCommand("dart.sortMembers", () => this.runCodeAction("source.sortMembers")),
		);
		// TODO: Enable this when https://github.com/dart-lang/sdk/issues/33521
		// is resolved.
		// this.commands.push(
		// 	vs.commands.registerCommand("dart.completeStatement", this.completeStatement, this),
		// );
	}

	private getActiveEditor() {
		return editors.getActiveRealFileEditor();
	}

	private async runCodeAction(action: string) {
		return vs.commands.executeCommand("editor.action.codeAction", { kind: action, apply: "ifSingle" });
	}

	// TODO(dantup): Is this wired up?!
	private async completeStatement(): Promise<void> {
		const editor = this.getActiveEditor();
		if (!editor || !editor.selection)
			return;

		const edit = await this.analyzer.completeStatement(
			{
				position: this.analyzer.client.code2ProtocolConverter.asPosition(editor.selection.start),
				textDocument: this.analyzer.client.code2ProtocolConverter.asVersionedTextDocumentIdentifier(editor.document),
			},
		);

		if (edit) {
			if (await this.validDocumentVersionsStillMatch(edit)) {
				const codeEdit = await this.analyzer.client.protocol2CodeConverter.asWorkspaceEdit(edit);

				if (!await vs.workspace.applyEdit(codeEdit)) {
					void vs.window.showErrorMessage("VS Code failed to apply edits");
				}
			} else {
				void vs.window.showErrorMessage("Documents have been modified so edits could not be applied");
			}
		}
	}

	private async validDocumentVersionsStillMatch(edit: WorkspaceEdit): Promise<boolean> {
		// If the edit didn't have any documentChanges (it has changes) we have
		// to assume it's all up-to-date.
		if (!edit.documentChanges)
			return true;

		const openTextDocuments: Map<string, vs.TextDocument> = new Map<string, vs.TextDocument>();
		vs.workspace.textDocuments.forEach((document) => openTextDocuments.set(document.uri.toString(), document));

		for (const change of edit.documentChanges) {
			if (TextDocumentEdit.is(change) && change.textDocument.version && change.textDocument.version >= 0) {
				if (TextDocumentEdit.is(change) && change.textDocument.version && change.textDocument.version >= 0) {
					const textDocument = openTextDocuments.get(change.textDocument.uri);
					if (textDocument && textDocument.version !== change.textDocument.version) {
						return false;
					}
				}
			}
		}

		return true;
	}

	public dispose(): any {
		for (const command of this.commands)
			command.dispose();
	}
}
