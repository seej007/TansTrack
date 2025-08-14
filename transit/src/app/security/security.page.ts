import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; 
import { Filesystem, Directory } from '@capacitor/filesystem';
@Component({
  selector: 'app-security',
  templateUrl: './security.page.html',
  styleUrls: ['./security.page.scss'],
  standalone: false
})
export class SecurityPage implements OnInit {
  // Incident form properties
  incidentType: string = '';
  incidentLocation: string = '';
  incidentDescription: string = '';
  isAnonymous: boolean = false;
  attachedImages: string[] = []; // Store attached image paths
  attachedVideos: string[] = []; // Store attached video paths

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) { }

  ngOnInit() {
    // Ensure the incident reports directory exists
    this.ensureIncidentReportsDirectory();
  }

  async makeEmergencyCall() {
    window.open('tel:09696129127', '_system');
  }

  async callTransitSecurity() {
    window.open('tel:+63321234567', '_system');
  }

  async callTerminalManager() {
    window.open('tel:+63321234568', '_system');
  }

  async callMedicalEmergency() {
    window.open('tel:117', '_system');
  }

  // Incident Reporting Methods
  async submitIncident() {
    if (!this.incidentType || !this.incidentDescription) {
      const toast = await this.toastController.create({
        message: 'Please fill in all required fields',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // In a real app, this would send data to a server
    console.log('Incident Report:', {
      type: this.incidentType,
      location: this.incidentLocation,
      description: this.incidentDescription,
      anonymous: this.isAnonymous,
      attachedImages: this.attachedImages,
      attachedVideos: this.attachedVideos,
      timestamp: new Date()
    });

    const toast = await this.toastController.create({
      message: 'Incident report submitted successfully',
      duration: 3000,
      color: 'success'
    });
    await toast.present();

    // Reset form
    this.incidentType = '';
    this.incidentLocation = '';
    this.incidentDescription = '';
    this.isAnonymous = false;
    this.attachedImages = [];
    this.attachedVideos = [];
  }

  async attachPhoto() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Add Media',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => {
            this.chooseFromGallery();
          }
        },
        {
          text: 'Record Video',
          icon: 'videocam',
          handler: () => {
            this.recordVideo();
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }
  async takePhoto() {
    try {
      console.log('Taking photo...');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        // Save to filesystem
        const savedImage = await this.saveImageToFilesystem(image);
        
        if (savedImage) {
          console.log('Photo saved to filesystem:', savedImage);
          this.attachedImages.push(savedImage);
          
          const toast = await this.toastController.create({
            message: 'Photo attached and saved successfully',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      const toast = await this.toastController.create({
        // message: 'Error taking photo',
        // duration: 2000,
        // color: 'danger'
      });
      await toast.present();
    }
  }

  async chooseFromGallery() {
    try {
      console.log('Choosing from gallery...');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        // Save to filesystem
        const savedImage = await this.saveImageToFilesystem(image);
        
        if (savedImage) {
          console.log('Image saved to filesystem:', savedImage);
          this.attachedImages.push(savedImage);
          
          const toast = await this.toastController.create({
            message: 'Photo attached and saved successfully',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        }
      }
    } catch (error) {
      console.error('Error selecting image from gallery:', error);
      const toast = await this.toastController.create({
        message: 'Error selecting photo',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async recordVideo() {
    try {
      console.log('Starting video recording...');
      
      // Show a toast to inform user about video recording
      const recordingToast = await this.toastController.create({
        message: 'Starting video recording...',
        duration: 2000,
        color: 'primary'
      });
      await recordingToast.present();

      const video = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
       
      });

      if (video.webPath) {
        // Save video to filesystem
        const savedVideo = await this.saveVideoToFilesystem(video.webPath);
        
        if (savedVideo) {
          console.log('Video saved to filesystem:', savedVideo);
          this.attachedVideos.push(savedVideo); // Store in videos array
          
          const toast = await this.toastController.create({
            message: 'Video recorded and saved successfully',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        }
      }
    } catch (error) {
      console.error('Error recording video:', error);
      
      // For now, show alternative options if video recording fails
      const alert = await this.alertController.create({
        header: 'Video Recording',
        message: 'Native video recording is not available. Would you like to choose a video from your gallery instead?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Choose Video',
            handler: () => {
              this.chooseVideoFromGallery();
            }
          }
        ]
      });
      await alert.present();
    }
  }

  async chooseVideoFromGallery() {
    try {
      console.log('Choosing video from gallery...');
      
      // Create a file input to select video files
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.style.display = 'none';
      
      input.onchange = async (event: any) => {
        const file = event.target.files[0];
        if (file) {
          console.log('Video selected:', file.name);
          
          // Create a blob URL for the video
          const videoBlob = new Blob([file], { type: file.type });
          const videoUrl = URL.createObjectURL(videoBlob);
          
          // Save video to filesystem
          const savedVideo = await this.saveVideoFromFile(file);
          
          if (savedVideo) {
            this.attachedVideos.push(savedVideo); // Store in videos array
            
            const toast = await this.toastController.create({
              message: 'Video selected and saved successfully',
              duration: 2000,
              color: 'success'
            });
            await toast.present();
          }
        }
        
        // Clean up
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
      
    } catch (error) {
      console.error('Error selecting video from gallery:', error);
      const toast = await this.toastController.create({
        message: 'Error selecting video',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async saveVideoFromFile(file: File): Promise<string | null> {
    try {
      // Generate unique filename
      const fileName = `incident_video_${Date.now()}.${file.name.split('.').pop() || 'mp4'}`;
      
      // Convert file to base64
      const base64Data = await this.convertFileToBase64(file);
      
      // Save to filesystem
      const savedFile = await Filesystem.writeFile({
        path: `incident_reports/${fileName}`,
        data: base64Data,
        directory: Directory.Documents
      });

      console.log('Video file saved to:', savedFile.uri);
      return savedFile.uri;
    } catch (error) {
      console.error('Error saving video file to filesystem:', error);
      
      const toast = await this.toastController.create({
        message: 'Error saving video to device storage',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      
      return null;
    }
  }

  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Filesystem Methods
  async saveImageToFilesystem(photo: any): Promise<string | null> {
    try {
      // Generate unique filename
      const fileName = `incident_photo_${Date.now()}.jpg`;
      
      // Read the image data
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64Data = await this.convertBlobToBase64(blob) as string;
      
      // Save to filesystem
      const savedFile = await Filesystem.writeFile({
        path: `incident_reports/${fileName}`,
        data: base64Data,
        directory: Directory.Documents
      });

      console.log('File saved to:', savedFile.uri);
      return savedFile.uri;
    } catch (error) {
      console.error('Error saving image to filesystem:', error);
      
      const toast = await this.toastController.create({
        message: 'Error saving image to device storage',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      
      return null;
    }
  }

  async saveVideoToFilesystem(videoPath: string): Promise<string | null> {
    try {
      // Generate unique filename
      const fileName = `incident_video_${Date.now()}.mp4`;
      
      // Read the video data
      const response = await fetch(videoPath);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64Data = await this.convertBlobToBase64(blob) as string;
      
      // Save to filesystem
      const savedFile = await Filesystem.writeFile({
        path: `incident_reports/${fileName}`,
        data: base64Data,
        directory: Directory.Documents
      });

      console.log('Video saved to:', savedFile.uri);
      return savedFile.uri;
    } catch (error) {
      console.error('Error saving video to filesystem:', error);
      
      const toast = await this.toastController.create({
        message: 'Error saving video to device storage',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      
      return null;
    }
  }

  private convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  // Get saved files (for viewing later)
  async getSavedIncidentFiles(): Promise<string[]> {
    try {
      const files = await Filesystem.readdir({
        path: 'incident_reports',
        directory: Directory.Documents
      });
      
      return files.files.map(file => `${Directory.Documents}/incident_reports/${file.name}`);
    } catch (error) {
      console.error('Error reading incident files:', error);
      return [];
    }
  }

  // Delete a saved file
  async deleteIncidentFile(filePath: string): Promise<boolean> {
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents
      });
      
      console.log('File deleted:', filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Create incident reports directory if it doesn't exist
  async ensureIncidentReportsDirectory(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: 'incident_reports',
        directory: Directory.Documents,
        recursive: true
      });
    } catch (error) {
      // Directory might already exist, that's okay
      console.log('Incident reports directory already exists or created');
    }
  }

  // Safety Resources Methods
  openSafetyManual() {
    console.log('Opening safety manual...');
    // In a real app, this would open a PDF or web page
  }

  openEmergencyProcedures() {
    console.log('Opening emergency procedures...');
    // In a real app, this would open emergency procedures
  }

  openSafetyVideos() {
    console.log('Opening safety training videos...');
    // In a real app, this would open video library
  }

  openReportSystem() {
    console.log('Opening report system...');
    // In a real app, this would open reporting system
  }


}
