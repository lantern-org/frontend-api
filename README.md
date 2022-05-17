# frontend-api

ideally -- website would include our api, and interact with it

```js
const handler = function (event) {
  console.log(event);
};
const L = Lantern.init(
  "example.com/api", // server api hostname
  5, // update frequency, in seconds
  handler // called when the api receives data from server
);
```
