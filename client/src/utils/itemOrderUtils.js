/**
 * Returns a new array with sort_order values reset to match the array order.
 * This keeps ordering predictable after an item is moved.
 */
export function normalizeSortOrder(items) {
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

/**
 * Moves one item one position earlier in the list.
 * If the item is already first, or the item is not found, the order stays the same.
 */
export function moveItemUp(items, itemId) {
  const reorderedItems = [...items];
  const currentIndex = reorderedItems.findIndex((item) => item.id === itemId);

  if (currentIndex <= 0) {
    return normalizeSortOrder(reorderedItems);
  }

  const previousIndex = currentIndex - 1;

  [reorderedItems[previousIndex], reorderedItems[currentIndex]] = [
    reorderedItems[currentIndex],
    reorderedItems[previousIndex],
  ];

  return normalizeSortOrder(reorderedItems);
}

/**
 * Moves one item one position later in the list.
 * If the item is already last, or the item is not found, the order stays the same.
 */
export function moveItemDown(items, itemId) {
  const reorderedItems = [...items];
  const currentIndex = reorderedItems.findIndex((item) => item.id === itemId);

  if (currentIndex === -1 || currentIndex === reorderedItems.length - 1) {
    return normalizeSortOrder(reorderedItems);
  }

  const nextIndex = currentIndex + 1;

  [reorderedItems[currentIndex], reorderedItems[nextIndex]] = [
    reorderedItems[nextIndex],
    reorderedItems[currentIndex],
  ];

  return normalizeSortOrder(reorderedItems);
}