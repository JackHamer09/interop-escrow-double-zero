# server

## 1.1.0

### Minor Changes

- e63d08b: - Removed `mainnet` chain (it was temporary)
  - Added some logs for better debugging
  - Added more data to the config endpoint

## 1.0.1

### Patch Changes

- f2ef21a: Update package dependencies for sdk and server.
  @lifi/sdk updated to 3.6.2 for the sdk and server, and @reown/appkit to 1.7.0 for the demo.

## 1.0.0

### Major Changes

- 4b03c0b: Adds the config api endpoint to the SDK which provides data on chains, providers and tokens.

  A new function `fetchConfig()` is added to the SDK to return config data from the server.
