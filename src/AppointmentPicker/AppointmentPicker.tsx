import React, { Component } from 'react';
import { Day } from './Day';
import { Appointment } from './Appointment';
import { Blank } from './Blank';

type IdentifierType = string | number;

interface AddedAppointmentInterface {
  day: string;
  number: IdentifierType;
  time: string;
  id?: IdentifierType;
}

type AddCallbackType = (
  day: string,
  number: IdentifierType,
  time: string,
  id?: IdentifierType
) => void;

type RemoveCallbackType = (day: string, number: IdentifierType) => void;

interface SimpleAddCaseInterface {
  addedAppointment: AddedAppointmentInterface;
  addCb: AddCallbackType;
}

interface ContinuousAddCaseInterface extends SimpleAddCaseInterface {
  removedAppointment: AddedAppointmentInterface;
  removeCb: RemoveCallbackType;
}

type AddAppointmentType = (
  args: ContinuousAddCaseInterface | SimpleAddCaseInterface
) => void;

type RemoveAppointmentType = (
  appointment: AddedAppointmentInterface,
  removeCb: RemoveCallbackType
) => void;

interface DefaultPropsInterface {
  addAppointmentCallback: AddAppointmentType;
  removeAppointmentCallback: RemoveAppointmentType;
  maxReservableAppointments: number;
  initialDay: Date;
  unitTime: number;
  local: string;
}

export type AppointmentAttributesType = {
  id?: IdentifierType;
  number: IdentifierType;
  isReserved?: boolean;
  isSelected?: boolean;
  periods?: number;
} | null;

interface AppointmentPickerPropsInterface {
  addAppointmentCallback?: AddAppointmentType;
  removeAppointmentCallback?: RemoveAppointmentType;
  alpha?: boolean;
  continuous?: boolean;
  selectedByDefault?: boolean;
  maxReservableAppointments?: number;
  initialDay?: Date;
  unitTime?: number;
  local?: string;
  visible?: boolean;
  loading?: boolean;
  days: AppointmentAttributesType[][];
  weeklyDisplay?: boolean;
  numberOfMonths?: number;
}

interface SelectedAppointmentInterface {
  time: string;
  id?: IdentifierType;
}

type SelectedAppointmentMapType = Map<
  string,
  Map<IdentifierType, SelectedAppointmentInterface>
>;

interface AppointmentPickerStateInterface {
  selectedAppointments: SelectedAppointmentMapType;
  size: number;
  dayPeriods: number[];
  dayLength: number;
  currentWeekFirstDay?: Date;
}

export class AppointmentPicker extends Component<
  AppointmentPickerPropsInterface,
  AppointmentPickerStateInterface
> {
  static defaultProps: DefaultPropsInterface = {
    addAppointmentCallback: ({
      addedAppointment: { day, number, time, id },
      addCb
    }) => {
      console.log(
        `Added appointment ${number}, day ${day}, time ${time}, id ${id}`
      );
      addCb(day, number, time, id);
    },
    removeAppointmentCallback: ({ day, number, time, id }, removeCb) => {
      console.log(
        `Removed appointment ${number}, day ${day}, time ${time}, id ${id}`
      );
      removeCb(day, number);
    },
    maxReservableAppointments: -1,
    initialDay: new Date(),
    unitTime: 15 * 60 * 1000,
    local: 'en-US'
  };

  constructor(props: AppointmentPickerPropsInterface) {
    super(props);
    const { days, initialDay } = props;
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
      dayLength: Math.max.apply(null, dayPeriods),
      currentWeekFirstDay: new Date(initialDay)
    };
    this.showPreviousWeek = this.showPreviousWeek.bind(this);
    this.showNextWeek = this.showNextWeek.bind(this);
  }

  static getDerivedStateFromProps(
    props: AppointmentPickerPropsInterface,
    state: AppointmentPickerStateInterface
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
    nextProps: AppointmentPickerPropsInterface,
    nextState: AppointmentPickerStateInterface
  ) {
    return (
      nextState.selectedAppointments !== this.state.selectedAppointments ||
      this.props.loading !== nextProps.loading ||
      nextState.currentWeekFirstDay !== this.state.currentWeekFirstDay
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
        const dayName = alpha
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
              dayName,
              appointment.number
            );
            if (
              size < maxReservableAppointments &&
              !appointmentAlreadySelected
            ) {
              this.addAppointment(
                selectedAppointments,
                dayName,
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
    selectedAppointments: SelectedAppointmentMapType,
    day: string,
    number: IdentifierType
  ) => {
    const currentDay = selectedAppointments.get(day);
    if (currentDay) {
      return !!currentDay.get(number);
    }
    return false;
  };

  addAppointment = (
    selectedAppointments: SelectedAppointmentMapType,
    day: string,
    number: IdentifierType,
    time: string,
    id?: IdentifierType
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

  deleteAppointment = (day: string, number: IdentifierType) => {
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
    number: IdentifierType,
    time: string,
    id?: IdentifierType
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

  acceptDeselection = (day: string, number: IdentifierType) => {
    const size = this.state.size;

    this.deleteAppointment(day, number);
    this.setState({
      size: size - 1
    });
  };

  selectAppointment = (
    day: string,
    number: IdentifierType,
    time: string,
    id?: IdentifierType
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
        addAppointmentCallback({
          addedAppointment: { day, number, time, id },
          addCb: this.acceptSelection
        });
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
        addAppointmentCallback({
          addedAppointment: { day, number, time, id },
          addCb: this.acceptSelection,
          removedAppointment: {
            day: auxDay,
            number: auxNumber,
            time: auxNumberInstance.time,
            id: auxNumberInstance.id
          },
          removeCb: this.acceptDeselection
        });
      }
    }
  };

  showNextWeek() {
    const { currentWeekFirstDay } = this.state;
    const actualDay = new Date(currentWeekFirstDay);
    actualDay.setDate(actualDay.getDate() + 7);
    this.setState((prevState) => ({
      ...prevState,
      currentWeekFirstDay: actualDay
    }));
  }

  showPreviousWeek() {
    const { currentWeekFirstDay } = this.state;
    const actualDay = new Date(currentWeekFirstDay);
    actualDay.setDate(actualDay.getDate() - 7);
    this.setState((prevState) => ({
      ...prevState,
      currentWeekFirstDay: actualDay
    }));
  }

  render() {
    const { weeklyDisplay } = this.props;
    return (
      <div className='appointment-content'>
        <div className={this.props.loading ? 'loader' : undefined} />
        {weeklyDisplay && (
          <div id='weekly-changer'>
            <i className='arrow right' onClick={this.showPreviousWeek} />
            <i className='arrow left' onClick={this.showNextWeek} />
          </div>
        )}
        <div className='appointment-picker'>{this.renderDays()} </div>
      </div>
    );
  }

  renderDays(): JSX.Element {
    const {
      selectedAppointments: appointments,
      dayPeriods,
      currentWeekFirstDay
    } = this.state;
    const { alpha, visible, local } = this.props;
    return (
      <>
        {this.props.days.map((day, index) => {
          const actualDay = new Date(currentWeekFirstDay);
          actualDay.setDate(actualDay.getDate() + index);

          const dayName = alpha
            ? actualDay.toLocaleDateString(local, { weekday: 'long' })
            : actualDay.toLocaleDateString(local);

          const isSelected = !!appointments.get(dayName);
          const props = {
            visible,
            dayName,
            actualDay,
            isSelected,
            selectedAppointment: null,
            appointments: day,
            selectAppointment: this.selectAppointment
          };

          return (
            <Day key={index} {...props}>
              {this.renderAppointments(
                day,
                dayName,
                isSelected,
                dayPeriods[index],
                actualDay
              )}
            </Day>
          );
        })}
      </>
    );
  }

  renderAppointments(
    appointments: AppointmentAttributesType[],
    dayName: string,
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
          dayName,
          appointment.number
        );
      const props = {
        isSelected,
        isReserved: appointment.isReserved,
        isEnabled: size < maxReservableAppointments || continuous,
        selectAppointment: this.selectAppointment.bind(
          this,
          dayName,
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
