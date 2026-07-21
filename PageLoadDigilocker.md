# DigiLocker Page Load Logic

This is the existing logic used in `src/pages/PersonalInfo/personalinfo.jsx` to decide whether the user still needs to do DigiLocker on page load.

## Source flow

1. Call `POST https://rekyc.meon.co.in/v1/user/get_module_data`
   with body:

```json
{ "page_id": "1" }
```

2. Read `result.data` and decrypt it using `decryptData(result.data)`.

3. Parse the decrypted JSON and extract:
   - `shared_data.clientcode`
   - fallback: `shared_data.client_code`
   - fallback: `shared_data.clientCode`

4. Normalize the client code before calling KRA API:

```js
const normalizeClientCode = (clientCode = "") =>
  clientCode.length > 3 ? clientCode.slice(3) : "";
```

5. Read DigiLocker completion flag from module data:

```js
const isDigilockerLinked = parsedModuleData?.["5"]?.is_digilocker === true;
```

6. If normalized client code is missing, the current logic stops here and skips KRA check.

7. If client code exists, call:

```txt
GET https://api.univest.in/api/broker/public/kra-type?userId=<normalizedClientCode>
```

8. Read:

```js
const isCvlKra = kraResult?.isCvlKra === true;
```

9. Final decision:

```js
if (!isCvlKra && !isDigilockerLinked) {
  setShowDigilockerModal(true);
}
```

## Meaning of the check

- If `isDigilockerLinked === true`, user has already done DigiLocker.
- If `isCvlKra === true`, user is already covered by CVL KRA, so DigiLocker is not forced.
- If both are `false`, treat user as DigiLocker pending and open DigiLocker flow on page load.

## Exact logic in plain words

On page load:

1. Fetch module data.
2. Decrypt it.
3. Check `["5"].is_digilocker`.
4. Extract and normalize `shared_data.clientcode`.
5. Call `kra-type`.
6. Only when:
   - KRA is not CVL, and
   - DigiLocker flag is not true

show DigiLocker prompt/modal.

## Suggested reuse in `UpdateEmail.jsx`

`UpdateEmail.jsx` already fetches `get_module_data` on mount inside its first `useEffect`. The cleanest reuse is:

1. Keep using that page-load API call.
2. After decrypting `moduleData.data`, run the same two checks:
   - `parsedModuleData?.["5"]?.is_digilocker === true`
   - `kra-type` using normalized `shared_data.clientcode`
3. If both checks fail, trigger the DigiLocker UI/redirect flow on page load.

## Reusable pseudo-code

```js
const PUBLIC_API_BASE_URL = "https://api.univest.in/api/broker/public";

const normalizeClientCode = (clientCode = "") =>
  clientCode.length > 3 ? clientCode.slice(3) : "";

const sharedData = parsedModuleData?.shared_data || {};
const clientCode =
  sharedData?.clientcode ||
  sharedData?.client_code ||
  sharedData?.clientCode;

const normalizedClientCode = normalizeClientCode(clientCode);
const isDigilockerLinked =
  parsedModuleData?.["5"]?.is_digilocker === true;

if (normalizedClientCode) {
  const kraResponse = await fetch(
    `${PUBLIC_API_BASE_URL}/kra-type?userId=${encodeURIComponent(normalizedClientCode)}`
  );

  const kraResult = await kraResponse.json();
  const isCvlKra = kraResult?.isCvlKra === true;

  if (!isCvlKra && !isDigilockerLinked) {
    // user has not done DigiLocker
    // trigger DigiLocker flow here
  }
}
```
