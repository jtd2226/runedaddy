import useEventListener from 'hooks/useEventListener';
/**
 * Hook that checks if a click was outside of a given ref
 * @param {Array} refs - array of refs to check if the click was inside
 * @param {Function} handleClickOutside - callback function if click is outside target
 */
export default function useClickOutside(ref, handleClickOutside) {
  const handleClick = e => {
    const container = ref.current;
    if (!container) return;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const { x, y, width, height } = container.getBoundingClientRect();
    const isInsideX = mouseX > x && mouseX < x + width;
    const isInsideY = mouseY > y && mouseY < y + height;
    if (isInsideX && isInsideY) return;

    const target = e.target;
    if (container === target) return;
    if (container.contains?.(target)) return;

    handleClickOutside?.();
  };
  useEventListener('click', handleClick);
}
