import * as assert from 'node:assert/strict';
import { ExtensionEditorView, ExtensionsViewSection, VSBrowser, Workbench } from 'vscode-extension-tester';

describe('E2E-00: packaged ResumeFlow', () => {
  it('appears as installed and opens its details through the real Extensions UI', async () => {
    const workbench = new Workbench();
    const extensions = await workbench.getActivityBar().getViewControl('Extensions');
    assert.ok(extensions, 'Extensions view must be available');
    const view = await extensions.openView();
    const installed = await view.getContent().getSection('Installed', ExtensionsViewSection);
    const item = await installed.findItem('@installed ResumeFlow');
    assert.ok(item, 'The packaged ResumeFlow extension must be installed');
    assert.equal(await item.isInstalled(), true);
    assert.equal(await item.getTitle(), 'ResumeFlow');

    await item.click();
    const details = new ExtensionEditorView();
    assert.equal(await details.getName(), 'ResumeFlow');
    assert.match(await details.getDescription(), /作業の文脈をローカルに保存/);
    await VSBrowser.instance.takeScreenshot('E2E-00-installed-extension');
  });
});
