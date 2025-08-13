



export function getRandomColor(): string {

  const colors = [
  '#4285F4',
  '#EA4335',
  '#FBBC05',
  '#34A853',
  '#5E35B1',
  '#00ACC1',
  '#43A047',
  '#FB8C00',
  '#3949AB',
  '#D81B60',
  '#8E24AA',
  '#E53935',
  '#1E88E5',
  '#00897B',
  '#7CB342',
  '#C0CA33',
  '#FDD835',
  '#6D4C41',
  '#546E7A'];


  return colors[Math.floor(Math.random() * colors.length)];
}