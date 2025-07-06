import {
  SERIALIZATION_METADATA_KEY,
  ClassSerializationMetadata,
  VisitedObject,
} from "./types";

/**
 * Retrieves the serialization metadata for a given class.
 * @param target The class constructor.
 * @returns The ClassSerializationMetadata object, or undefined if not found.
 */
export function getSerializationMetadata(
  target: Function
): ClassSerializationMetadata | undefined {
  return Reflect.getMetadata(SERIALIZATION_METADATA_KEY, target);
}

/**
 * Ensures that serialization metadata exists for a class, creating it if necessary.
 * @param target The class constructor.
 * @returns The ClassSerializationMetadata object.
 */
export function ensureSerializationMetadata(
  target: Function
): ClassSerializationMetadata {
  let metadata = getSerializationMetadata(target);
  if (!metadata) {
    // Inherit metadata from parent class if it exists
    const parent = Object.getPrototypeOf(target.prototype)?.constructor;
    if (parent && parent !== Object && getSerializationMetadata(parent)) {
      metadata = {
        properties: new Map(getSerializationMetadata(parent)?.properties),
      };
    } else {
      metadata = {
        properties: new Map(),
      };
    }
    Reflect.defineMetadata(SERIALIZATION_METADATA_KEY, metadata, target);
  }
  return metadata;
}

/**
 * Checks if a value is a primitive type.
 * @param value The value to check.
 * @returns True if the value is a primitive, false otherwise.
 */
export function isPrimitive(value: any): boolean {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  );
}

/**
 * Checks if a value is a Date object.
 * @param value The value to check.
 * @returns True if the value is a Date object, false otherwise.
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if a class is marked as serializable.
 * @param target The class constructor.
 * @returns True if the class has serialization metadata, false otherwise.
 */
export function isSerializable(target: Function): boolean {
  return Reflect.hasMetadata(SERIALIZATION_METADATA_KEY, target);
}

/**
 * Generates a unique ID for circular reference tracking.
 */
let nextCircularId = 1;
export function getNextCircularId(): number {
  return nextCircularId++;
}
export function resetCircularIdCounter(): void {
  nextCircularId = 1;
}

/**
 * Finds an object in the visited list.
 * @param obj The object to find.
 * @param visited The list of visited objects.
 * @returns The VisitedObject if found, undefined otherwise.
 */
export function findVisitedObject(
  obj: any,
  visited: VisitedObject[]
): VisitedObject | undefined {
  for (const item of visited) {
    if (item.obj === obj) {
      return item;
    }
  }
  return undefined;
}
