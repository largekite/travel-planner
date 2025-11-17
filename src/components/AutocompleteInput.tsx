import React, { useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  types?: string[];
};

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
  types = ["(cities)"]
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types,
      fields: ["name", "formatted_address", "geometry"]
    });

    const listener = autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.name) {
        onChange(place.name);
      }
    });

    return () => {
      if (listener) google.maps.event.removeListener(listener);
    };
  }, [onChange, types]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}