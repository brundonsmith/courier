import { serve as denoServe } from "https://deno.land/std@v0.139.0/http/server.ts";

const METHODS = ['get', 'post', 'put', 'delete', 'options'] as const
export type Method = typeof METHODS[number]

export type Segment = `/${string}` | `:${string}` | '*'
export type PathPattern = [...Segment[], Segment | '**']

export type HandlerFn = (req: Request, params: Record<string, string>) => Promise<Response> | Response
export type MiddlewareFn = (req: Request, params: Record<string, string>) => Promise<Request | Response> | Request | Response

type Handler = {
    method: Method,
    pathPattern: PathPattern,
    fn: HandlerFn
}

type Middleware = {
    pathPattern: PathPattern,
    fn: MiddlewareFn
}

function matchParams(url: string, pathPattern: PathPattern): Record<string, string> | null {
    const pathname = new URL(url).pathname
    const requestSegments = pathname.split('/').slice(1)

    const params: Record<string, string> = {}

    for (let i = 0; i < requestSegments.length; i++) {
        const requestSegment = requestSegments[i]
        const pattern = pathPattern[i]

        if (requestSegment == null || pattern == null) {
            return null
        }

        if (pattern[0] === '/') {
            if ('/' + requestSegment !== pattern) {
                return null
            }
        } else if (pattern === '*') {
            // do nothing
        } else if (pattern === '**') {
            return params
        } else {
            params[pattern.substring(1)] = requestSegment
        }
    }

    return params
}


type App = {
    [method in Method]: (pathPattern: PathPattern, fn: HandlerFn) => void
} & {
    use: (pathPattern: PathPattern, fn: MiddlewareFn) => void,
    listen: (port: number) => Promise<void>
}

export function create(): App {
    const handlers: Handler[] = []
    const middlewares: Middleware[] = []

    function createMethod(method: Method) {
        return (pathPattern: PathPattern, fn: HandlerFn) => {
            handlers.push({
                method: method,
                pathPattern,
                fn
            })
        }
    }

    return {
        get: createMethod('get'),
        post: createMethod('post'),
        put: createMethod('put'),
        delete: createMethod('delete'),
        options: createMethod('options'),

        use(pathPattern, fn) {
            middlewares.push({
                pathPattern,
                fn
            })
        },

        listen(port) {
            return denoServe(async req => {
                for (const middleware of middlewares) {
                    const params = matchParams(req.url, middleware.pathPattern)
                    if (params != null) {
                        const middlewareRes = await middleware.fn(req, params)

                        if (middlewareRes instanceof Request) {
                            req = middlewareRes
                        } else {
                            return middlewareRes
                        }
                    }
                }

                for (const handler of handlers) {
                    const params = matchParams(req.url, handler.pathPattern)
                    if (params != null && req.method.toUpperCase() === handler.method.toUpperCase()) {
                        return handler.fn(req, params)
                    }
                }

                return new Response(null, { status: 404 })
            }, { port })
        }
    }
}
