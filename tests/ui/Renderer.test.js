import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { Renderer } from '../../js/ui/Renderer.js';

test('Renderer (UI Layer)', async (t) => {
  // Setup simulated browser environment
  const dom = new JSDOM(`<!DOCTYPE html><div id="uploadStatus"></div><div id="loading"></div>`);
  const document = dom.window.document;
  
  const mockElements = {
    uploadStatus: document.getElementById('uploadStatus'),
    loading: document.getElementById('loading')
  };

  const renderer = new Renderer(mockElements);

  await t.test('setStatus should update DOM text and classes', () => {
    renderer.setStatus(mockElements.uploadStatus, "Success", "success");
    
    assert.strictEqual(mockElements.uploadStatus.textContent, "Success");
    assert.ok(mockElements.uploadStatus.classList.contains('success'));
    assert.strictEqual(mockElements.uploadStatus.style.display, "block");
  });

  await t.test('showLoading should toggle loading spinner visibility', () => {
    renderer.showLoading(true);
    assert.ok(mockElements.loading.classList.contains('visible'));
    
    renderer.showLoading(false);
    assert.strictEqual(mockElements.loading.classList.contains('visible'), false);
  });
});
