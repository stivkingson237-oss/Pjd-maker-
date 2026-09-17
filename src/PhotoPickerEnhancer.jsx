import React from 'react';

// Sécurité React : l'ancienne version modifiait directement le DOM
// géré par React (insertBefore/appendChild), ce qui provoquait
// NotFoundError: "insertBefore" pendant les re-renders.
export default function PhotoPickerEnhancer() {
  return null;
}
