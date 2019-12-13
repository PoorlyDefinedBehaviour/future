## Something that looks like a JavaScript Promise

```ts
import axios from "axios";
import Future from "./future/Future";

function main(): void {
  new Future<any>((resolve, reject) => {
    axios
      .get(`https://api.github.com/users/poorlydefinedbehaviour/repos`)
      .then(response => resolve(response))
      .catch(error => reject(error));
  })
    .then(response => response.data)
    .then(data => data[0].id)
    .then(id => console.log(`id => ${id}`))
    .catch(error => console.log("error", error));
}
main();
```
