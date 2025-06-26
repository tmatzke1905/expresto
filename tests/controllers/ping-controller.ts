import type { ExtRequest, ExtResponse } from '../../src/lib/types';

export default {
  route: '/ping',
  handlers: [
    {
      method: 'get',
      path: '/',
      secure: false,
      handler: (req: ExtRequest, res: ExtResponse) => {
        res.json({ pong: true });
      },
    },
  ],
};
