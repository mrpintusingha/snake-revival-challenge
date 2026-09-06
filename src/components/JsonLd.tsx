/**
 * Renders a schema.org JSON-LD block. Safe anywhere in the document (not
 * just <head>) — search engines and AI crawlers both parse it wherever it
 * appears. `data` is always our own static/brand content, never raw user
 * input, so serializing it into a script tag carries no injection risk.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
