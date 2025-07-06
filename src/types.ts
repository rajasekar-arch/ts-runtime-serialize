// src/types.ts
import "reflect-metadata"; // Required for decorator metadata

/**
 * Symbol used to store serialization metadata on classes.
 */
export const SERIALIZATION_METADATA_KEY = Symbol("serialization:metadata");

/**
 * Interface for options passed to the @SerializeProperty decorator.
 */
export interface SerializePropertyOptions {
  /**
   * The name of the property in the serialized output.
   * If not provided, the original property name is used.
   */
  name?: string;
  /**
   * A function that returns the constructor of the nested class if the property is a complex object.
   * Example: `@Type(() => MyNestedClass)`
   */
  type?: () => new (...args: any[]) => any;
  /**
   * A custom transformer object for this property.
   * Allows custom serialization/deserialization logic.
   */
  transformer?: CustomTransformer<any, any>;
  /**
   * If true, this property will be excluded from serialization and deserialization.
   * Default is false.
   */
  exclude?: boolean;
}

/**
 * Defines a custom transformer for a property.
 * This allows for custom serialization and deserialization logic.
 */
export interface CustomTransformer<TSource, TTarget> {
  /**
   * Transforms the value from the source object to the serialized target format.
   * @param value The value from the original object.
   * @returns The transformed value for serialization.
   */
  serialize(value: TSource): TTarget;
  /**
   * Transforms the value from the serialized data back to the original object format.
   * @param value The value from the serialized data.
   * @returns The transformed value for deserialization.
   */
  deserialize(value: TTarget): TSource;
}

/**
 * Represents the metadata stored for a serializable property.
 */
export interface PropertyMetadata extends SerializePropertyOptions {
  propertyName: string; // Original property name in the class
}

/**
 * Represents the overall serialization metadata for a class.
 */
export interface ClassSerializationMetadata {
  properties: Map<string, PropertyMetadata>; // Map of original property name to its metadata
}

/**
 * Options for the serialize function.
 */
export interface SerializeOptions {
  /**
   * If true, properties with undefined values will be included in the serialized output.
   * Default is false.
   */
  includeUndefined?: boolean;
  /**
   * If true, circular references will throw an error.
   * If false, circular references will be handled by ID-based re-linking.
   * Default is false (handle by ID-based re-linking).
   */
  throwOnCircular?: boolean;
}

/**
 * Options for the deserialize function.
 */
export interface DeserializeOptions {
  /**
   * If true, properties not found in the serialized data but present in the class
   * will be initialized with their default values or undefined.
   * Default is true.
   */
  strict?: boolean; // Currently not fully implemented for strictness, but for future use
}

/**
 * Helper interface for tracking objects during circular reference detection.
 */
export interface VisitedObject {
  id: number;
  obj: any;
}

/**
 * Helper interface for tracking serialized objects during circular reference handling.
 */
export interface SerializedObjectReference {
  __serializedId__: number;
}

/**
 * Helper interface for tracking deserialized objects during circular reference handling.
 */
export interface DeserializedObjectReference {
  __deserializedId__: number;
}
