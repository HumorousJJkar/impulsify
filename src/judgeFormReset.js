// A tiny shared flag between two screens. When you tap "Done" on a verdict, the
// verdict screen asks the Judge form to clear itself the next time it's shown.
// (Module-level variables live as long as the app runs, like a static field in Java.)

let resetRequested = false;

export function requestJudgeFormReset() {
  resetRequested = true;
}

// Returns true once per request, then resets the flag.
export function takeJudgeFormReset() {
  const requested = resetRequested;
  resetRequested = false;
  return requested;
}
