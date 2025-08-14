import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  // Custom password validator
  static passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null; // Let required validator handle empty values
      }

      const hasNumber = /[0-9]/.test(value);
      const hasLetter = /[a-zA-Z]/.test(value);
      const hasMinLength = value.length >= 8;
      
      const errors: any = {};
      
      if (!hasMinLength) {
        errors.minLength = 'Password must be at least 8 characters long';
      }
      
      if (!hasNumber) {
        errors.requiresNumber = 'Password must contain at least one number';
      }
      
      if (!hasLetter) {
        errors.requiresLetter = 'Password must contain at least one letter';
      }
      
      return Object.keys(errors).length ? errors : null;
    };
  }

  // Password confirmation validator
  static passwordMatchValidator(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get(passwordField);
      const confirmPassword = formGroup.get(confirmPasswordField);
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  // Age validator for students
  static ageValidator(minAge: number = 13, maxAge: number = 25): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      const age = parseInt(value, 10);
      
      if (isNaN(age)) {
        return { invalidAge: 'Please enter a valid age' };
      }
      
      if (age < minAge) {
        return { minAge: `Age must be at least ${minAge}` };
      }
      
      if (age > maxAge) {
        return { maxAge: `Age cannot exceed ${maxAge}` };
      }
      
      return null;
    };
  }

  // Phone number validator
  static phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      // Simple phone validation - adjust regex based on your requirements
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      
      return phoneRegex.test(value) ? null : { invalidPhone: 'Please enter a valid phone number' };
    };
  }

  // URL validator
  static urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      try {
        new URL(value);
        return null;
      } catch {
        return { invalidUrl: 'Please enter a valid URL' };
      }
    };
  }

  // Get error message for display
  static getErrorMessage(errors: ValidationErrors | null): string {
    if (!errors) {
      return '';
    }
    
    const errorKeys = Object.keys(errors);
    const firstError = errorKeys[0];
    const errorValue = errors[firstError];
    
    // Return custom error message if available, otherwise use key
    return typeof errorValue === 'string' ? errorValue : firstError;
  }
}
