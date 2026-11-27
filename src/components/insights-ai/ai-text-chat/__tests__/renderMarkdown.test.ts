import { describe, expect, it } from 'vitest';

/*
 * Model output is untrusted: sanitized markdown may never produce an <img>,
 * because that would let the model force the browser to fetch any host.
 */

import { renderMarkdown } from '../helpers/renderMarkdown';

describe('renderMarkdown', () => {
  it('drops image markdown instead of emitting an img tag', () => {
    const html = renderMarkdown('![alt](https://example.com/a.png)');

    expect(html).not.toContain('<img');
    expect(html).not.toContain('example.com/a.png');
  });

  it('keeps regular markdown formatting', () => {
    const html = renderMarkdown('**bold** and [link](https://example.com)');

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.com"');
  });
});
