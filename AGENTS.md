# Repository guidance

This is the independent Haccora UK repository. Keep production changes on reviewable branches, preserve migration history and never commit runtime environment files, service-role keys, signing credentials or live provider secrets.

Run `npm run quality` and the native typecheck/export gates before releasing.

