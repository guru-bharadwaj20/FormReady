/** Hash router: #/fix, #/pdf, #/specs, #/about. No history library needed. */

export type Route = 'fix' | 'pdf' | 'specs' | 'about';

const ROUTES: readonly Route[] = ['fix', 'pdf', 'specs', 'about'];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'fix';
}

let current = $state<Route>(typeof location === 'undefined' ? 'fix' : parse(location.hash));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parse(location.hash);
  });
}

export const router = {
  get current(): Route {
    return current;
  },
  href(route: Route): string {
    return `#/${route}`;
  },
  go(route: Route): void {
    if (typeof location !== 'undefined') location.hash = `/${route}`;
    current = route;
  },
  routes: ROUTES,
};
