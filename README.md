
## Example usage

```typescript
import { create } from 'https://raw.githubusercontent.com/brundonsmith/courier/master/index.ts'

const app = create()

app.use(['**'], req => {
    console.log('Middleware activated for request to ' + req.url + '!')
    return req
})

app.get(['/greeting'], () => new Response('Hello world!'))

app.get(['/stuff', ':myParam'], (req, params) => {
    return new Response(JSON.stringify(params))
})

app.listen(8000)
```