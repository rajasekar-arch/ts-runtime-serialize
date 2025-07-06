
// src/decorators.ts
import "reflect-metadata";
import {
  SerializePropertyOptions,
  PropertyMetadata,
  CustomTransformer,
} from "./types";
import { ensureSerializationMetadata } from "./utils";

/**
 * Class decorator to mark a class as serializable.
 * This is required for the serializer to process the class.
 */
export function Serializable(): ClassDecorator {
  return (target: Function) => {
    // Ensure metadata is initialized for the class
    ensureSerializationMetadata(target);
  };
}

/**
 * Property decorator to define serialization options for a property.
 * @param options Optional configuration for the property.
 */
export function SerializeProperty(
  options?: SerializePropertyOptions
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;
    const metadata = ensureSerializationMetadata(constructor);

    const propertyName = propertyKey.toString();
    const propertyMetadata: PropertyMetadata = {
      propertyName: propertyName,
      name: options?.name || propertyName, // Use 'name' from options or original property name
      type: options?.type,
      transformer: options?.transformer,
      exclude: options?.exclude || false,
    };

    metadata.properties.set(propertyName, propertyMetadata);
  };
}

/**
 * Helper decorator to specify the type of a nested serializable object or array.
 * This is crucial for deserialization to correctly instantiate nested classes.
 * @param typeFunction A function that returns the constructor of the nested class.
 */
export function Type(
  typeFunction: () => new (...args: any[]) => any
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;
    const metadata = ensureSerializationMetadata(constructor);

    const propertyName = propertyKey.toString();
    const existingMetadata = metadata.properties.get(propertyName) || {
      propertyName,
      name: propertyName,
    };
    existingMetadata.type = typeFunction;
    metadata.properties.set(propertyName, existingMetadata as PropertyMetadata);
  };
}

/**
 * Decorator to apply a custom transformer to a property.
 * @param transformer The custom transformer object.
 */
export function CustomSerializer<TSource, TTarget>(
  transformer: CustomTransformer<TSource, TTarget>
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;
    const metadata = ensureSerializationMetadata(constructor);

    const propertyName = propertyKey.toString();
    const existingMetadata = metadata.properties.get(propertyName) || {
      propertyName,
      name: propertyName,
    };
    existingMetadata.transformer = transformer;
    metadata.properties.set(propertyName, existingMetadata as PropertyMetadata);
  };
}

