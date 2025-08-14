import { Component, OnInit } from '@angular/core';

interface Route {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  startLocation: string;
  endLocation: string;
  status: 'active' | 'upcoming' | 'completed';
}

interface WeekDay {
  name: string;
  date: number;
  routes: number;
  isToday: boolean;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false
})
export class SchedulePage implements OnInit {
  currentDate: string = '';
  todayRoutes: number = 3;
  totalHours: number = 8;
  estimatedPassengers: number = 120;
  currentView: string = 'daily';

  dailySchedules = [
    {
      route: 'Route 42 - Downtown Express',
      startTime: '08:30 AM',
      endTime: '10:30 AM',
      startLocation: 'Central Hub',
      endLocation: 'Downtown Terminal',
      status: 'Active'
    },
    {
      route: 'Route 16 - Riverfront Line',
      startTime: '11:00 AM',
      endTime: '12:30 PM',
      startLocation: 'Downtown Terminal',
      endLocation: 'University Circle',
      status: 'Scheduled'
    },
    {
      route: 'Route 24 - Ocean Boulevard',
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      startLocation: 'University Circle',
      endLocation: 'Central Station',
      status: 'Scheduled'
    }
  ];

  weekDays: WeekDay[] = [];

  constructor() { }

  ngOnInit() {
    this.updateCurrentDate();
    this.generateWeekDays();
  }

  segmentChanged(event: any) {
    this.currentView = event.detail.value;
  }

  updateCurrentDate() {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  generateWeekDays() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      this.weekDays.push({
        name: dayNames[i],
        date: date.getDate(),
        routes: Math.floor(Math.random() * 5) + 1, // Random number of routes
        isToday: date.toDateString() === today.toDateString()
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'upcoming':
        return 'warning';
      case 'completed':
        return 'medium';
      default:
        return 'medium';
    }
  }
}
