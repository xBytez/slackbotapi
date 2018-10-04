const slackAPI = require('../index');

jest.mock('../index');

it('Check slackapi is initialized', () => {
    const s = new slackAPI();
    expect(slackAPI).toHaveBeenCalledTimes(1);
});


it('Check slackapi receives object', () => {
    const mockslackAPIInstance = slackAPI.mock.instances[0];
    expect(mockslackAPIInstance).toBeTruthy();
})


