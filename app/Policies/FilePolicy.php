<?php

namespace App\Policies;

use App\Models\File;
use App\Models\User;

class FilePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, File $file): bool
    {
        // Public files are accessible to everyone
        if ($file->visibility === 'public') {
            return true;
        }

        // Private files require authentication
        if (! $user) {
            return false;
        }

        // Owner can always view their files
        if ($file->user_id === $user->id) {
            return true;
        }

        // Check if user has permission to view all files
        if ($user->can('view all files')) {
            return true;
        }

        // Check if file is attached to a model the user can access
        if ($file->fileable) {
            // Let the fileable model's policy handle this
            return $user->can('view', $file->fileable);
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, File $file): bool
    {
        // Owner can update their files
        if ($file->user_id === $user->id) {
            return true;
        }

        // Check if user has permission to manage all files
        if ($user->can('manage all files')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, File $file): bool
    {
        // Owner can delete their files
        if ($file->user_id === $user->id) {
            return true;
        }

        // Check if user has permission to manage all files
        if ($user->can('manage all files')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, File $file): bool
    {
        return $this->delete($user, $file);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, File $file): bool
    {
        return $user->can('manage all files');
    }

    /**
     * Determine whether the user can download the file.
     */
    public function download(User $user, File $file): bool
    {
        return $this->view($user, $file);
    }
}
