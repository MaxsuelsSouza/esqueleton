// Ponto de entrada — inicia o servidor em ambiente local
import { buildApp } from './app'

const app = buildApp()

app.listen(
  { port: Number(process.env.PORT) || 3001, host: '0.0.0.0' },
  (err) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
  }
)
