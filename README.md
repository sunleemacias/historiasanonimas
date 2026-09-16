# Historias sin firma

Juego grupal para descubrir quién escribió cada historia.

## Flujo

1. Registra al menos tres participantes.
2. Cada participante escribe una historia breve en privado.
3. Cada persona vota quién cree que escribió cada historia.
4. Se muestra el ranking de aciertos sin revelar los autores verdaderos.

La partida se conserva en el navegador con `localStorage`.

Para jugar desde diferentes computadoras, crea una sala y comparte su código. El anfitrión decide cuándo iniciar, después de confirmar que el equipo está listo. La votación avanza historia por historia: nadie puede pasar a la siguiente hasta que todos hayan votado la actual. Después de cada ronda se muestra un gráfico parcial, se revela el autor de esa historia y la sala queda pausada hasta que el anfitrión decide continuar.

El mejor adivinador recibe `Aprendiz de Sherlock Holmes`. Si hay empate en el primer lugar, los premios de los empatados alternan entre `Aprendiz de Sherlock Holmes` y `Secuaz del Doctor Moriarty`. El último lugar recibe `Alma gemela de Watson`.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/`.

Para probar el servidor completo en producción localmente:

```bash
npm run build
npm start
```

## Render

El archivo `render.yaml` configura un **Web Service**. Usa `npm install && npm run build` como build command y `npm start` como start command. No hace falta agregar una rewrite rule manual: Express sirve la aplicación y resuelve el fallback de `index.html`.

## Validación

```bash
npm run build
```
