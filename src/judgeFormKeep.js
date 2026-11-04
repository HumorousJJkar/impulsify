// A tiny shared flag between two screens. Coming back from a verdict clears the
// Judge form, except when you tapped "Tweak the details": then the verdict screen
// asks the form to keep its values so you can change one thing and re-judge.
// (Module-level variables live as long as the app runs, like a static field in Java.)

let keepRequested = false;

export function requestKeepJudgeForm() {
  keepRequested = true;
}

// Returns true once per request, then resets the flag.
export function takeKeepJudgeForm() {
  const requested = keepRequested;
  keepRequested = false;
  return requested;
}
