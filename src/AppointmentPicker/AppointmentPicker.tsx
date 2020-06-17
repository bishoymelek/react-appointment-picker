import React, { Component } from 'react';
import { Day } from './Day';
import { Appointment } from './Appointment';
import { Blank } from './Blank';

type DayNumber = string | number;

type AddedAppointment = {
  day: string;
  number: DayNumber;
  time: string;
  id?: string;
};

type AddCallBack = (
  day: string,
  number: DayNumber,
  time: string,
  id?: string
) => void;

type RemoveCallBack = (day: string, number: DayNumber) => void;

type AddAppointment = (
  addedAppointment: AddedAppointment,
  addCb: AddCallBack,
  removedAppointment?: AddedAppointment,
  removeCb?: RemoveCallBack
) => void;

type RemoveAppointment = (
  appointment: AddedAppointment,
  removeCb: RemoveCallBack
) => void;

type AppointmentAttributes = {
  id?: string;
  number: DayNumber;
  isReserved?: boolean;
  isSelected?: boolean;
  periods?: number;
};

interface AppointmentPickerProps {
  addAppointmentCallback: AddAppointment;
  removeAppointmentCallback: RemoveAppointment;
  alpha: boolean;
  visible: boolean;
  continuous: boolean;
  loading: boolean;
  selectedByDefault: boolean;
  maxReservableAppointments: number;
  initialDay: Date;
  unitTime: number;
  local: string;
  days: AppointmentAttributes[][];
}

type SelectedAppointment = {
  time: string;
  id?: string;
};

type selectedAppointmentMap = Map<string, Map<DayNumber, SelectedAppointment>>;

interface AppointmentPickerState {
  selectedAppointments: selectedAppointmentMap;
  size: number;
  dayPeriods: number[];
  dayLength: number;
}

export class AppointmentPicker extends Component<
  AppointmentPickerProps,
  AppointmentPickerState
> {
  static defaultProps = {
    addAppointmentCallback: (
      { day, number, time, id }: AddedAppointment,
      addCb: AddCallBack
    ) => {
      console.log(
        `Added appointment ${number}, day ${day}, time ${time}, id ${id}`
      );
      addCb(day, number, time, id);
    },
    removeAppointmentCallback: (
      { day, number, time, id }: AddedAppointment,
      removeCb: RemoveCallBack
    ) => {
      console.log(
        `Removed appointment ${number}, day ${day}, time ${time}, id ${id}`
      );
      removeCb(day, number);
    },
    continuous: false,
    maxReservableAppointments: 0,
    initialDay: new Date(),
    unitTime: 15 * 60 * 1000,
    local: 'en-US'
  };

  constructor(props: AppointmentPickerProps) {
    super(props);
    const { days } = props;
    const {
      selectedAppointments,
      size
    } = this.getAlreadySelectedAppointments();
    const dayPeriods = days.map((day) => {
      let periods = 0;
      day.forEach((obj) => {
        periods = obj
          ? obj.periods
            ? periods + obj.periods
            : periods + 1
          : periods + 1;
      });
      return periods;
    });
    this.state = {
      selectedAppointments: selectedAppointments,
      size: size,
      dayPeriods,
      dayLength: Math.max.apply(null, dayPeriods)
    };
  }

  static getDerivedStateFromProps(
    props: AppointmentPickerProps,
    state: AppointmentPickerState
  ) {
    const { selectedAppointments: currentSelectedAppointments } = state;
    if (props.maxReservableAppointments < state.size) {
      let sum = 0;
      const selectedAppointments = new Map();
      for (const currentDay of currentSelectedAppointments.keys()) {
        const day = currentSelectedAppointments.get(currentDay);
        const lengthByDay = day ? day.size : 0;
        if (sum + lengthByDay < props.maxReservableAppointments) {
          selectedAppointments.set(currentDay, day);
        } else {
          const dif = props.maxReservableAppointments - sum;
          let i = 0;
          if (day) {
            for (const currentNumber of day.keys()) {
              if (i < dif) day.delete(currentNumber);
              i++;
            }
          }
          selectedAppointments.set(currentDay, day);
          return {
            selectedAppointments: selectedAppointments,
            size: props.maxReservableAppointments
          };
        }
        sum = sum + lengthByDay;
      }
    }
    return null;
  }

  shouldComponentUpdate(
    nextProps: AppointmentPickerProps,
    nextState: AppointmentPickerState
  ) {
    return (
      nextState.selectedAppointments !== this.state.selectedAppointments ||
      this.props.loading !== nextProps.loading
    );
  }

  getAlreadySelectedAppointments = () => {
    const selectedAppointments = new Map();
    let size = 0;
    const {
      maxReservableAppointments,
      alpha,
      selectedByDefault,
      initialDay,
      unitTime,
      local
    } = this.props;
    if (selectedByDefault) {
      this.props.days.forEach((day, index) => {
        const actualDay = new Date(
          initialDay.getTime() + 60 * 60 * 24 * 1000 * index
        );
        const dayNumber = alpha
          ? actualDay.toLocaleDateString(local, { weekday: 'long' })
          : actualDay.toLocaleDateString(local);

        let key = 0;
        day.forEach((appointment, _) => {
          if (appointment === null) {
            key = key + 1;
          } else if (appointment.isSelected) {
            const time = new Date(
              actualDay.getTime() + unitTime * key
            ).toLocaleTimeString(local);
            const appointmentAlreadySelected = this.includeAppointment(
              selectedAppointments,
              dayNumber,
              appointment.number
            );
            if (
              size < maxReservableAppointments &&
              !appointmentAlreadySelected
            ) {
              this.addAppointment(
                selectedAppointments,
                dayNumber,
                appointment.number,
                time,
                appointment.id
              );
              size = size + 1;
            }
          }
        });
      });
    }
    return { selectedAppointments, size };
  };

  includeAppointment = (
    selectedAppointments: selectedAppointmentMap,
    day: string,
    number: DayNumber
  ) => {
    const currentDay = selectedAppointments.get(day);
    if (currentDay) {
      return !!currentDay.get(number);
    }
    return false;
  };

  addAppointment = (
    selectedAppointments: selectedAppointmentMap,
    day: string,
    number: DayNumber,
    time: string,
    id?: string
  ) => {
    const currentDay = selectedAppointments.get(day);
    if (currentDay) {
      const currentAppointment = currentDay.get(number);
      if (!currentAppointment) {
        currentDay.set(number, {
          id,
          time
        });
      }
    } else {
      selectedAppointments.set(
        day,
        new Map([
          [
            number,
            {
              id,
              time
            }
          ]
        ])
      );
    }
  };

  deleteAppointment = (day: string, number: DayNumber) => {
    const { selectedAppointments } = this.state;
    const currentDay = selectedAppointments.get(day);
    if (currentDay) {
      currentDay.delete(number);
      if (!(currentDay.size > 0)) {
        selectedAppointments.delete(day);
      }
    }
  };

  acceptSelection = (
    day: string,
    number: DayNumber,
    time: string,
    id?: string
  ) => {
    const { selectedAppointments, size } = this.state;
    const { maxReservableAppointments } = this.props;
    if (size < maxReservableAppointments) {
      this.addAppointment(selectedAppointments, day, number, time, id);
      this.setState({
        size: size + 1
      });
    }
  };

  acceptDeselection = (day: string, number: DayNumber) => {
    const size = this.state.size;

    this.deleteAppointment(day, number);
    this.setState({
      size: size - 1
    });
  };

  selectAppointment = (
    day: string,
    number: DayNumber,
    time: string,
    id?: string
  ) => {
    const { selectedAppointments } = this.state;
    const size = this.state.size;
    const {
      maxReservableAppointments,
      addAppointmentCallback,
      removeAppointmentCallback,
      continuous
    } = this.props;
    const appointmentAlreadySelected = this.includeAppointment(
      selectedAppointments,
      day,
      number
    );

    if (size < maxReservableAppointments) {
      if (!appointmentAlreadySelected) {
        addAppointmentCallback({ day, number, time, id }, this.acceptSelection);
      } else {
        removeAppointmentCallback(
          { day, number, time, id },
          this.acceptDeselection
        );
      }
    } else {
      const currentDay = selectedAppointments.get(day);
      if (currentDay && appointmentAlreadySelected) {
        removeAppointmentCallback(
          { day, number, time, id },
          this.acceptDeselection
        );
      } else if (continuous) {
        const auxDay = selectedAppointments.keys().next().value;
        const auxDayInstance = selectedAppointments.get(auxDay);
        const auxNumber = auxDayInstance.keys().next().value;
        const auxNumberInstance = auxDayInstance.get(auxNumber);
        addAppointmentCallback(
          { day, number, time, id },
          this.acceptSelection,
          {
            day: auxDay,
            number: auxNumber,
            time: auxNumberInstance.time,
            id: auxNumberInstance.id
          },
          this.acceptDeselection
        );
      }
    }
  };

  render() {
    return (
      <div className='appointment-content'>
        <div className={this.props.loading ? 'loader' : undefined} />
        <div className='appointment-picker'>{this.renderDays()}</div>
      </div>
    );
  }

  renderDays() {
    const { selectedAppointments: appointments, dayPeriods } = this.state;
    const { alpha, visible, initialDay, local } = this.props;
    return this.props.days.map((day, index) => {
      const actualDay = new Date(
        initialDay.getTime() + 60 * 60 * 24 * 1000 * index
      );
      /* const options = {
        weekday: 'long'
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      } */
      const dayNumber = alpha
        ? actualDay.toLocaleDateString(local, { weekday: 'long' })
        : actualDay.toLocaleDateString(local);

      const isSelected = !!appointments.get(dayNumber);
      const props = {
        visible,
        dayNumber,
        isSelected,
        selectedAppointment: null,
        appointments: day,
        selectAppointment: this.selectAppointment
      };

      return (
        <Day key={index} {...props}>
          {this.renderAppointments(
            day,
            dayNumber,
            isSelected,
            dayPeriods[index],
            actualDay
          )}
        </Day>
      );
    });
  }

  renderAppointments(
    appointments: AppointmentAttributes[],
    dayNumber: string,
    isDaySelected: boolean,
    periods: number,
    actualDay: Date
  ) {
    const { selectedAppointments, size, dayLength } = this.state;
    const {
      maxReservableAppointments,
      unitTime,
      local,
      continuous
    } = this.props;
    const blanks = new Array(
      dayLength - periods > 0 ? dayLength - periods : 0
    ).fill(0);
    let key = 0;
    const day = appointments.map((appointment) => {
      if (appointment === null) {
        key = key + 1;
        return <Blank key={key} />;
      }
      const time = new Date(
        actualDay.getTime() + unitTime * key
      ).toLocaleTimeString(local);
      const isSelected =
        isDaySelected &&
        this.includeAppointment(
          selectedAppointments,
          dayNumber,
          appointment.number
        );
      const props = {
        isSelected,
        isReserved: appointment.isReserved,
        isEnabled: size < maxReservableAppointments || continuous,
        selectAppointment: this.selectAppointment.bind(
          this,
          dayNumber,
          appointment.number,
          time,
          appointment.id
        ),
        appointmentNumber: time,
        periods: appointment.periods ? appointment.periods : 1,
        time: time
      };
      key =
        key +
        (appointment ? (appointment.periods ? appointment.periods : 1) : 1);
      return <Appointment key={key} {...props} />;
    });
    if (blanks.length > 0) {
      blanks.forEach((_, index) => {
        day.push(<Blank key={(key + index + 1) * 2} />);
      });
    }
    return day;
  }
}