import {
  SERIALIZATION_METADATA_KEY,
  ClassSerializationMetadata,
  PropertyMetadata,
  SerializeOptions,
  VisitedObject,
  SerializedObjectReference,
} from "./types";
import {
  SerializationError,
  CircularReferenceError,
  InvalidTypeError,
} from "./errors";
import {
  getSerializationMetadata,
  isPrimitive,
  isDate,
  isSerializable,
  getNextCircularId,
  resetCircularIdCounter,
  findVisitedObject,
} from "./utils";

/**
 * Serializes a serializable class instance into a plain JavaScript object.
 * @param instance The instance of the serializable class.
 * @param options Optional serialization options.
 * @returns A plain JavaScript object representing the serialized instance.
 * @throws {SerializationError} if serialization fails.
 */
export function serialize<T extends object>(
  instance: T,
  options?: SerializeOptions
): any {
  // Reset circular ID counter for each new serialization call
  resetCircularIdCounter();
  const visited: VisitedObject[] = []; // Track visited objects for circular references
  const serializedMap = new Map<any, SerializedObjectReference>(); // Map original object to its serialized reference

  function _serialize(obj: any, path: string = ""): any {
    if (isPrimitive(obj)) {
      return obj;
    }

    if (isDate(obj)) {
      return obj.toISOString(); // Serialize Date objects to ISO strings
    }

    // Handle circular references
    const visitedEntry = findVisitedObject(obj, visited);
    if (visitedEntry) {
      if (options?.throwOnCircular) {
        throw new CircularReferenceError(
          `Circular reference detected for object at path '${path}'.`,
          path
        );
      }
      // If not throwing, return a reference to the already serialized object
      const existingRef = serializedMap.get(obj);
      if (existingRef) {
        return { __serializedRefId__: existingRef.__serializedId__ };
      }
    }

    const objId = getNextCircularId();
    visited.push({ id: objId, obj: obj });

    // Handle Arrays
    if (Array.isArray(obj)) {
      const serializedArray = obj.map((item, index) =>
        _serialize(item, `${path}[${index}]`)
      );
      // Store array's serialized reference for potential future circular references
      serializedMap.set(obj, { __serializedId__: objId });
      return serializedArray;
    }

    // Handle Objects (classes or plain objects)
    const targetConstructor = obj.constructor;
    if (!isSerializable(targetConstructor)) {
      // If it's not a serializable class, but a plain object, serialize its properties
      // If it's a non-serializable class instance, throw an error
      if (targetConstructor !== Object) {
        throw new InvalidTypeError(
          `Non-serializable class instance found at path '${path}'. Only plain objects or classes decorated with @Serializable() can be serialized.`,
          path
        );
      }

      const plainObjectResult: { [key: string]: any } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          plainObjectResult[key] = _serialize(obj[key], `${path}.${key}`);
        }
      }
      serializedMap.set(obj, { __serializedId__: objId });
      return plainObjectResult;
    }

    const metadata = getSerializationMetadata(targetConstructor);
    if (!metadata) {
      throw new SerializationError(
        `Class ${targetConstructor.name} is marked as Serializable but has no metadata. Ensure @Serializable() is applied.`
      );
    }

    const serializedObject: { [key: string]: any } = {};
    serializedMap.set(obj, { __serializedId__: objId }); // Store reference before processing properties

    metadata.properties.forEach((propMeta: PropertyMetadata) => {
      if (propMeta.exclude) {
        return; // Skip excluded properties
      }

      const originalValue = (obj as any)[propMeta.propertyName];
      const serializedPropName = propMeta.name || propMeta.propertyName;

      if (originalValue === undefined && !options?.includeUndefined) {
        return; // Skip undefined properties unless explicitly included
      }

      if (propMeta.transformer) {
        try {
          serializedObject[serializedPropName] =
            propMeta.transformer.serialize(originalValue);
        } catch (e: any) {
          throw new SerializationError(
            `Custom transformer failed for property '${propMeta.propertyName}' at path '${path}': ${e.message}`
          );
        }
      } else if (propMeta.type) {
        const nestedType = propMeta.type();
        if (Array.isArray(originalValue)) {
          // Handle array of nested serializable objects
          serializedObject[serializedPropName] = originalValue.map(
            (item, index) =>
              _serialize(item, `${path}.${propMeta.propertyName}[${index}]`)
          );
        } else if (originalValue instanceof nestedType) {
          // Handle single nested serializable object
          serializedObject[serializedPropName] = _serialize(
            originalValue,
            `${path}.${propMeta.propertyName}`
          );
        } else if (originalValue === null || originalValue === undefined) {
          serializedObject[serializedPropName] = originalValue; // Keep null/undefined as is
        } else {
          throw new InvalidTypeError(
            `Property '${propMeta.propertyName}' at path '${path}' is decorated with @Type(() => ${nestedType.name}) but its value is not an instance of that type or an array of that type.`,
            propMeta.propertyName
          );
        }
      } else {
        // Default serialization for primitives, dates, or plain objects
        serializedObject[serializedPropName] = _serialize(
          originalValue,
          `${path}.${propMeta.propertyName}`
        );
      }
    });

    serializedObject.__serializedId__ = objId; // Add unique ID for deserialization re-linking
    return serializedObject;
  }

  // Start serialization from the root instance
  return _serialize(instance);
}
