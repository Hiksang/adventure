export function validateCode(input: string, expected: string): boolean {
  return input.trim().toUpperCase() === expected.trim().toUpperCase();
}

export function validateQuizAnswers(
  answers: number[],
  correctAnswers: number[]
): { correct: number; total: number } {
  let correct = 0;
  for (let i = 0; i < correctAnswers.length; i++) {
    if (answers[i] === correctAnswers[i]) correct++;
  }
  return { correct, total: correctAnswers.length };
}
