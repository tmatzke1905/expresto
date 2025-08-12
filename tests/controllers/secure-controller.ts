import type { ExtRequest, ExtResponse } from '../../src/lib/types';

export default {
  route: '/secure',
  handlers: [
    {
      method: 'get',
      path: '/basic',
      secure: 'basic',
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json({ ok: true, type: 'basic' });
      },
    },
    {
      method: 'get',
      path: '/jwt',
      secure: 'jwt',
      handler: (_req: ExtRequest, res: ExtResponse) => {
        res.json({ ok: true, type: 'jwt' });
      },
    },
  ],
};
