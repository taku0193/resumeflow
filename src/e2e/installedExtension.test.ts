import * as assert from 'node:assert/strict';
import { error, ExtensionEditorView, ExtensionsViewSection, VSBrowser, Workbench } from 'vscode-extension-tester';

describe('E2E-00: packaged ResumeFlow', () => {
  it('appears as installed and opens its details through the real Extensions UI', async () => {
    const workbench = new Workbench();
    const extensions = await workbench.getActivityBar().getViewControl('Extensions');
    assert.ok(extensions, 'Extensions view must be available');
    await extensions.openView();
    const item = await VSBrowser.instance.driver.wait(async () => {
      try {
        // The Extensions view rebuilds while scanning installed extensions.
        // Reacquire handles during the bounded UI wait, not by rerunning tests.
        const content = new Workbench().getSideBar().getContent();
        const installed = await content.getSection('Installed', ExtensionsViewSection);
        for (const candidate of await installed.getVisibleItems()) {
          if (await candidate.getTitle() === 'ResumeFlow') return candidate;
        }
        return false;
      } catch (caught) {
        if (caught instanceof error.StaleElementReferenceError || caught instanceof error.NoSuchElementError) {
          return false;
        }
        throw caught;
      }
    }, 15000, 'ResumeFlow must appear in the installed extensions view');
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
