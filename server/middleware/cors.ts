import type { NextFunction, Request, Response } from 'express';

type CorsRule =
  | { type: 'wildcard' }
  | { type: 'exact'; origin: string }
  | { type: 'subdomain'; domain: string };

const normalizeOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return origin.trim();
  }
};

const parseCorsRules = (raw: string | undefined): CorsRule[] => {
  if (!raw) {
    return [{ type: 'wildcard' }];
  }

  const entries = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!entries.length) {
    return [{ type: 'wildcard' }];
  }

  return entries.map((entry) => {
    if (entry === '*') {
      return { type: 'wildcard' } as const;
    }

    if (entry.startsWith('*.')) {
      return { type: 'subdomain', domain: entry.slice(2).toLowerCase() } as const;
    }

    return { type: 'exact', origin: normalizeOrigin(entry) } as const;
  });
};

const originMatchesRule = (origin: string, rule: CorsRule): boolean => {
  if (rule.type === 'wildcard') {
    return true;
  }

  if (rule.type === 'exact') {
    return normalizeOrigin(origin) === rule.origin;
  }

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === rule.domain) {
      return true;
    }

    return hostname.endsWith(`.${rule.domain}`);
  } catch {
    return false;
  }
};

export const createCorsMiddleware = () => {
  const rules = parseCorsRules(process.env.MOBILE_ALLOWED_ORIGINS);
  const allowAnyOrigin = rules.some((rule) => rule.type === 'wildcard');

  return (req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

    if (requestOrigin && (allowAnyOrigin || rules.some((rule) => originMatchesRule(requestOrigin, rule)))) {
      if (allowAnyOrigin) {
        res.header('Access-Control-Allow-Origin', '*');
      } else {
        res.header('Access-Control-Allow-Origin', requestOrigin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '600');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  };
};

