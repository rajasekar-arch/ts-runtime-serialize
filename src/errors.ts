// src/errors.ts
import { SERIALIZATION_METADATA_KEY } from "./types";

/**
 * Base error class for all serialization/deserialization issues.
 */
export class SerializationError extends Error {
  public readonly name: string = "SerializationError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SerializationError.prototype);
  }
}

/**
 * Error thrown when a circular reference is detected during serialization
 * and `throwOnCircular` is true.
 */
export class CircularReferenceError extends SerializationError {
  public readonly name: string = "CircularReferenceError";
  constructor(message: string, public readonly path: string) {
    super(`Circular reference detected at path '${path}': ${message}`);
    Object.setPrototypeOf(this, CircularReferenceError.prototype);
  }
}

/**
 * Error thrown when deserialization fails due to invalid data format or missing types.
 */
export class DeserializationError extends SerializationError {
  public readonly name: string = "DeserializationError";
  constructor(message: string, public readonly path?: string) {
    super(
      path
        ? `Deserialization failed at path '${path}': ${message}`
        : `Deserialization failed: ${message}`
    );
    Object.setPrototypeOf(this, DeserializationError.prototype);
  }
}

/**
 * Error thrown when an invalid type is encountered during serialization/deserialization.
 */
export class InvalidTypeError extends SerializationError {
  public readonly name: string = "InvalidTypeError";
  constructor(message: string, public readonly propertyName?: string) {
    super(
      propertyName
        ? `Invalid type for property '${propertyName}': ${message}`
        : `Invalid type: ${message}`
    );
    Object.setPrototypeOf(this, InvalidTypeError.prototype);
  }
}
