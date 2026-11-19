const apex = 'datanights.org.il';
const canonical = 'www.datanights.org.il';

export async function onRequest({request, next}) {
  const url = new URL(request.url);
  const read = request.method === 'GET' || request.method === 'HEAD';

  if (url.hostname === apex && read) {
    url.hostname = canonical;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url, 308);
  }

  if (url.hostname === canonical && url.pathname === '/robots.txt' && read) {
    return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nAllow: /\n', {
      headers: {'Content-Type': 'text/plain; charset=utf-8'},
    });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  if (url.hostname === canonical) headers.delete('X-Robots-Tag');
  else headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
