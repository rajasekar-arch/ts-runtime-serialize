import {
  PropertyMetadata,
  DeserializeOptions,
  DeserializedObjectReference,
  SerializedObjectReference,
} from "./types";
import { DeserializationError, InvalidTypeError } from "./errors";
import {
  getSerializationMetadata,
  isPrimitive,
  isSerializable,
} from "./utils";

/**
 * Deserializes a plain JavaScript object back into an instance of a serializable class.
 * @param data The plain JavaScript object to deserialize.
 * @param targetClass The constructor of the target serializable class.
 * @param options Optional deserialization options.
 * @returns An instance of the target serializable class.
 * @throws {DeserializationError} if deserialization fails.
 */
export function deserialize<T extends object>(
  data: any,
  targetClass: new (...args: any[]) => T,
  options?: DeserializeOptions
): T {
  if (!isSerializable(targetClass)) {
    throw new DeserializationError(
      `Class ${targetClass.name} is not marked as Serializable. Ensure @Serializable() is applied.`
    );
  }

  const deserializedMap = new Map<number, any>(); // Map ID to deserialized object for circular references

  function _deserialize(
    value: any,
    currentClass: new (...args: any[]) => any,
    path: string = ""
  ): any {
    if (isPrimitive(value)) {
      return value;
    }

    // Handle Date strings (assuming ISO format from serialization)
    if (typeof value === "string" && !isNaN(new Date(value).getTime())) {
      const parsedDate = new Date(value);
      if (parsedDate.toISOString() === value) {
        // Basic check for ISO format
        return parsedDate;
      }
    }

    // Handle circular reference placeholders
    if (
      typeof value === "object" &&
      value !== null &&
      "__serializedRefId__" in value
    ) {
      const refId = (
        value as SerializedObjectReference & { __serializedRefId__: number }
      ).__serializedRefId__;
      const existingInstance = deserializedMap.get(refId);
      if (!existingInstance) {
        // This indicates a forward reference or an issue in serialization order.
        // We'll return a placeholder and link it later.
        return { __deserializedId__: refId };
      }
      return existingInstance;
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      // If currentClass is expected to be an array of a specific type,
      // we need to know that type. This is typically handled by @Type(() => MyClass)
      // on the property holding the array. If not, it's treated as an array of primitives/plain objects.
      return value.map(
        (item, index) => _deserialize(item, Object, `${path}[${index}]`) // Default to Object if no specific type is known for array elements
      );
    }

    // Handle Objects (plain objects or instances of classes)
    if (typeof value === "object" && value !== null) {
      const instanceId = (
        value as DeserializedObjectReference & { __serializedId__?: number }
      ).__serializedId__;
      let instance: any;

      if (instanceId !== undefined) {
        // If it's a serialized object with an ID, check if it's already being processed
        if (deserializedMap.has(instanceId)) {
          // This should ideally not be hit directly if circular reference handling is correct,
          // but acts as a safeguard.
          return deserializedMap.get(instanceId);
        }
      }

      // Instantiate the target class or a plain object
      if (currentClass === Object) {
        instance = {}; // Plain object
      } else if (isSerializable(currentClass)) {
        try {
          instance = new currentClass();
        } catch (e: any) {
          throw new DeserializationError(
            `Could not instantiate class '${currentClass.name}' at path '${path}'. Ensure it has a parameterless constructor or proper constructor handling. Original error: ${e.message}`,
            path
          );
        }
      } else {
        throw new InvalidTypeError(
          `Cannot deserialize to non-serializable class '${currentClass.name}' at path '${path}'.`,
          path
        );
      }

      if (instanceId !== undefined) {
        deserializedMap.set(instanceId, instance); // Store instance for circular reference re-linking
      }

      const metadata = getSerializationMetadata(currentClass);
      if (!metadata) {
        // If it's a plain object or a non-decorated class (which should have been caught earlier),
        // just copy properties directly.
        for (const key in value) {
          if (
            Object.prototype.hasOwnProperty.call(value, key) &&
            key !== "__serializedId__"
          ) {
            instance[key] = _deserialize(value[key], Object, `${path}.${key}`);
          }
        }
        return instance;
      }

      // Populate properties based on metadata
      metadata.properties.forEach((propMeta: PropertyMetadata) => {
        if (propMeta.exclude) {
          return; // Skip excluded properties
        }

        const serializedPropName = propMeta.name || propMeta.propertyName;
        const serializedValue = value[serializedPropName];

        if (serializedValue === undefined) {
          // If property is missing in serialized data, and strict mode is on, handle as error or default
          // For now, just skip. Future strict mode could throw.
          return;
        }

        if (propMeta.transformer) {
          try {
            instance[propMeta.propertyName] =
              propMeta.transformer.deserialize(serializedValue);
          } catch (e: any) {
            throw new DeserializationError(
              `Custom transformer failed for property '${propMeta.propertyName}' at path '${path}': ${e.message}`,
              path
            );
          }
        } else if (propMeta.type) {
          const nestedClass = propMeta.type();
          if (Array.isArray(serializedValue)) {
            // Handle array of nested serializable objects
            instance[propMeta.propertyName] = serializedValue.map(
              (item, index) =>
                _deserialize(
                  item,
                  nestedClass,
                  `${path}.${serializedPropName}[${index}]`
                )
            );
          } else if (
            serializedValue === null ||
            serializedValue === undefined
          ) {
            instance[propMeta.propertyName] = serializedValue; // Keep null/undefined as is
          } else {
            // Handle single nested serializable object
            instance[propMeta.propertyName] = _deserialize(
              serializedValue,
              nestedClass,
              `${path}.${serializedPropName}`
            );
          }
        } else {
          // Default deserialization for primitives, dates, or plain objects
          instance[propMeta.propertyName] = _deserialize(
            serializedValue,
            Object,
            `${path}.${serializedPropName}`
          );
        }
      });

      return instance;
    }

    return value; // Should not be reached for non-primitive, non-array, non-object values
  }

  const result = _deserialize(data, targetClass);

  // Second pass: Resolve circular references
  function resolveCircularReferences(obj: any) {
    if (typeof obj !== "object" || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (
          typeof obj[i] === "object" &&
          obj[i] !== null &&
          "__deserializedId__" in obj[i]
        ) {
          const refId = (
            obj[i] as DeserializedObjectReference & {
              __deserializedId__: number;
            }
          ).__deserializedId__;
          const resolvedInstance = deserializedMap.get(refId);
          if (!resolvedInstance) {
            throw new DeserializationError(
              `Failed to resolve circular reference with ID ${refId}. Object not found in map.`
            );
          }
          obj[i] = resolvedInstance;
        } else {
          resolveCircularReferences(obj[i]);
        }
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (
            typeof obj[key] === "object" &&
            obj[key] !== null &&
            "__deserializedId__" in obj[key]
          ) {
            const refId = (
              obj[key] as DeserializedObjectReference & {
                __deserializedId__: number;
              }
            ).__deserializedId__;
            const resolvedInstance = deserializedMap.get(refId);
            if (!resolvedInstance) {
              throw new DeserializationError(
                `Failed to resolve circular reference with ID ${refId}. Object not found in map.`
              );
            }
            obj[key] = resolvedInstance;
          } else {
            resolveCircularReferences(obj[key]);
          }
        }
      }
    }
  }

  // Perform the second pass to resolve any remaining circular references
  // This is crucial for cases where a reference appears before the actual object is fully deserialized.
  resolveCircularReferences(result);

  return result;
}
