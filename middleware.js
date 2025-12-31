export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - favicon.ico (favicon file)
     * - session (the session tracking page)
     * - manifest.json (the PWA manifest)
     * - sw.js (the service worker)
     * - assets or local files (paths with a dot)
     */
    "/((?!api|favicon.ico|session|manifest.json|sw.js|.*\\.).*)",
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  if (path && path !== "index.html") {
    // Redirect /ID to /?exhibitor_id=ID
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("exhibitor_id", path);
    return Response.redirect(redirectUrl, 307);
  }

  return;
}
